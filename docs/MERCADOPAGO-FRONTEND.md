# Integración Mercado Pago – Resumen para Frontend

Resumen de los cambios en la API para que el front pueda usar Mercado Pago (Checkout Pro).

---

## 1. Endpoint nuevo: crear preferencia y obtener URL de pago

**Método y ruta:** `POST /api/v1/payments/mercadopago/preference`  
**Autenticación:** Bearer JWT (usuario debe ser el comprador de la orden).

**Body (JSON):**
```json
{
  "orderId": "id-de-la-orden"
}
```

**Respuesta 200:**
```json
{
  "initPoint": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=xxxx",
  "preferenceId": "xxxx",
  "paymentId": "id-del-pago-en-nuestra-db"
}
```

- **initPoint**: URL a la que hay que redirigir al usuario para que pague en Mercado Pago (Checkout Pro).
- **preferenceId**: ID de la preferencia en Mercado Pago.
- **paymentId**: ID del registro de pago en nuestra API (para consultar estado si hace falta).

**Errores posibles:**
- `404` – Orden no encontrada.
- `403` – El usuario no es el comprador de la orden.
- `400` – Orden no está en estado pendiente de pago, o Mercado Pago no está configurado.

---

## 2. Flujo completo (qué tiene que hacer el front)

1. **Usuario tiene una orden en estado “pendiente de pago”.**
2. **Front llama a la API** (con el JWT del comprador):
   - `POST /api/v1/payments/mercadopago/preference` con `{ "orderId": "<idOrden>" }`.
3. **Front recibe `initPoint`** en la respuesta.
4. **Redirigir al usuario** a `initPoint` (misma pestaña o nueva):
   - `window.location.href = initPoint`  
   - o abrir en nueva pestaña y luego redirigir cuando vuelva.
5. **Usuario paga (o no)** en Mercado Pago.
6. **Mercado Pago redirige al usuario** a una de estas URLs de vuelta (configuradas en backend):
   - **Éxito:** `{APP_URL}/payment/success?orderId=<orderId>`
   - **Pendiente:** `{APP_URL}/payment/pending?orderId=<orderId>`
   - **Rechazo/error:** `{APP_URL}/payment/failure?orderId=<orderId>`

Por tanto el front **debe tener estas rutas/pantallas** y leer el query `orderId`:

- `/payment/success?orderId=xxx` – Pago aprobado.
- `/payment/pending?orderId=xxx` – Pago pendiente (ej. pendiente de acreditación).
- `/payment/failure?orderId=xxx` – Pago rechazado o cancelado.

En cada una pueden:
- Mostrar el estado (éxito / pendiente / error).
- Opcionalmente llamar a `GET /api/v1/orders` o `GET /api/v1/orders/:id` para refrescar el estado de la orden (el backend actualiza la orden a “pagada” cuando llega el webhook de Mercado Pago).

---

## 3. Webhook (solo backend)

El endpoint `POST /api/v1/payments/mercadopago/webhook` lo llama **solo Mercado Pago**; el front **no** debe llamarlo.  
Sirve para que el backend actualice el pago y la orden cuando el usuario paga. No requiere cambios en el front.

---

## 4. Consultar estado de la orden después del pago

Después de que el usuario vuelve de Mercado Pago:

- **Opción A:** Confiar en las URLs de vuelta y mostrar éxito/pendiente/error según la ruta (`/payment/success`, etc.).
- **Opción B:** Usar el `orderId` de la URL y llamar a:
  - `GET /api/v1/orders` (lista del usuario) o  
  - `GET /api/v1/orders/:id` (detalle de la orden)  
  para ver si la orden ya pasó a estado `PAID` (el webhook puede tardar unos segundos).

---

## 5. Resumen de rutas del front que hay que tener

| Ruta (ejemplo)           | Uso                                      |
|--------------------------|------------------------------------------|
| `/payment/success`       | Query: `orderId`. Mostrar “Pago exitoso”  |
| `/payment/pending`       | Query: `orderId`. Mostrar “Pago pendiente”|
| `/payment/failure`       | Query: `orderId`. Mostrar “Pago fallido” |

La base de la URL (`APP_URL`) la define el backend; el front solo debe implementar esas rutas en su app (por ejemplo `https://tu-app.com/payment/success`, etc.).

---

## 6. Ejemplo mínimo de uso (front)

```javascript
// Usuario eligió “Pagar con Mercado Pago” para una orden ya creada
async function goToMercadoPagoCheckout(orderId) {
  const res = await fetch('/api/v1/payments/mercadopago/preference', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ orderId }),
  });

  if (!res.ok) {
    // manejar error (403, 400, 404)
    return;
  }

  const { initPoint } = await res.json();
  window.location.href = initPoint; // redirige a Mercado Pago
}
```

---

## 7. Variables de entorno (backend)

El front no necesita tokens de Mercado Pago. El backend usa:

- `MERCADOPAGO_ACCESS_TOKEN` – Token de la app en Mercado Pago.
- `APP_URL` – URL base de la API (para armar el webhook y las `back_urls` de éxito/pendiente/fallo). En producción debe ser la URL pública de la API.

Si el front y la API están en distintos dominios, el front solo debe usar la misma base URL de la API que ya use para el resto de los endpoints.

---

## 8. Checklist frontend

- [ ] Botón/acción “Pagar con Mercado Pago” que llame a `POST /api/v1/payments/mercadopago/preference` con el `orderId`.
- [ ] Redirigir al usuario a `initPoint` devuelto por la API.
- [ ] Ruta/página `/payment/success?orderId=xxx`.
- [ ] Ruta/página `/payment/pending?orderId=xxx`.
- [ ] Ruta/página `/payment/failure?orderId=xxx`.
- [ ] (Opcional) En esas páginas, llamar a `GET /api/v1/orders` o `GET /api/v1/orders/:id` para mostrar el estado actualizado de la orden.

Con esto el front puede usar Mercado Pago sin tocar el webhook ni las credenciales de Mercado Pago.
