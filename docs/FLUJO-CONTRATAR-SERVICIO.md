# Paso a paso: contratar un servicio (comprador)

Flujo completo desde que el usuario elige un servicio hasta que recibe el trabajo y puede dejar una reseña.

---

## Resumen del flujo

1. Ver el servicio y decidir comprar  
2. Crear la orden (queda pendiente de pago)  
3. Pagar con Mercado Pago  
4. Chatear con el vendedor (opcional)  
5. Recibir la entrega  
6. Aprobar o pedir revisión  
7. Dejar una reseña (opcional)

---

## Paso 1 – Ver el servicio

**Front:** Pantalla de detalle del servicio.

**API:**
- `GET /api/v1/services/:id` — Datos del servicio (título, precio, descripción, músico, etc.).
- Opcional: `GET /api/v1/services/:id?includeReviews=true` — Incluir reseñas.
- Opcional: `GET /api/v1/reviews?serviceId=:id` — Solo reseñas del servicio.

El usuario ve precio, descripción, plazos de entrega y decide contratar.

---

## Paso 2 – Crear la orden

**Front:** Botón “Contratar” / “Comprar”. El usuario debe estar logueado (JWT del comprador).

**API:**  
`POST /api/v1/orders`  
**Headers:** `Authorization: Bearer <token>`  
**Body (JSON):**
```json
{
  "serviceId": "<id del servicio>",
  "sellerId": "<id del dueño del servicio = service.owner.id>",
  "amount": 5000,
  "currency": "USD"
}
```

- **amount:** En centavos si usan USD (ej. 5000 = 50 USD). Debe coincidir con el precio del servicio (o el que muestren en el checkout).
- **sellerId:** Debe ser `service.owner.id` del servicio elegido.

**Respuesta:** Orden creada con `status: "PENDING_PAYMENT"` y `chatId` (ya se creó el chat para esa orden). Guardar `order.id` y `order.chatId` para los siguientes pasos.

---

## Paso 3 – Pagar con Mercado Pago

**Front:** Pantalla “Pagar” o “Ir a pagar” usando el `orderId` del paso 2.

**API:**  
`POST /api/v1/payments/mercadopago/preference`  
**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`  
**Body (JSON):**
```json
{
  "orderId": "<id de la orden creada>"
}
```

**Respuesta:**
```json
{
  "initPoint": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=...",
  "preferenceId": "...",
  "paymentId": "..."
}
```

**Front:** Redirigir al usuario a `initPoint`. El usuario paga (o cancela) en Mercado Pago.

Mercado Pago redirige de vuelta a:
- **Éxito:** `{APP_URL}/payment/success?orderId=...`
- **Pendiente:** `{APP_URL}/payment/pending?orderId=...`
- **Error:** `{APP_URL}/payment/failure?orderId=...`

El backend recibe el webhook de Mercado Pago y actualiza la orden a **PAID** cuando el pago está aprobado.

---

## Paso 4 – Chatear con el vendedor (opcional)

**Front:** En “Mis órdenes” o detalle de orden, botón “Ver chat” usando `order.chatId`.

**API:**
- `GET /api/v1/chats` — Lista de chats del usuario.
- `GET /api/v1/chats/:chatId` — Chat con mensajes (orden y vendedor).
- `POST /api/v1/chats/:chatId/messages` — Enviar mensaje (body: `{ "body": "texto" }`, opcional `attachments`).
- Para adjuntos: `POST /api/v1/chats/:chatId/upload` (form-data con archivos), luego usar las URLs en el body del mensaje.

El comprador y el vendedor pueden coordinar detalles del trabajo por acá.

---

## Paso 5 – Recibir la entrega

Lo hace el **vendedor** en su panel: sube archivos y descripción. El **comprador** solo consume la API para ver y descargar.

**API (comprador):**
- `GET /api/v1/deliveries` — Entregas del usuario (como comprador o vendedor).
- `GET /api/v1/deliveries/order/:orderId` — Entregas de una orden.
- `GET /api/v1/deliveries/:id` — Detalle de una entrega.
- `GET /api/v1/deliveries/:deliveryId/files/:fileId/download` — Descargar un archivo.

Cuando el vendedor entrega, el comprador recibe notificación (si tienen notificaciones implementadas) y puede ver la entrega en “Mis órdenes” o “Entregas”.

---

## Paso 6 – Aprobar o pedir revisión

**Front:** En la pantalla de la entrega, botones “Aprobar” o “Pedir cambios”.

**API (solo comprador):**

- **Aprobar (todo bien):**  
  `POST /api/v1/deliveries/:deliveryId/approve`  
  **Headers:** `Authorization: Bearer <token>`  
  Sin body.

- **Pedir revisión (cambios):**  
  `POST /api/v1/deliveries/:deliveryId/request-revision`  
  **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`  
  **Body (JSON):**
  ```json
  {
    "feedback": "Necesito que subas el volumen de la guitarra y menos reverb en la voz."
  }
  ```
  (Mínimo 10 caracteres en `feedback`.)

Si aprueba, la orden puede pasar a **COMPLETED**. Si pide revisión, el vendedor puede subir una nueva versión y volver a entregar.

---

## Paso 7 – Dejar una reseña (opcional)

Cuando la orden está **COMPLETED**, el comprador puede dejar una reseña.

**API:**  
`POST /api/v1/reviews`  
**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`  
**Body (JSON):**
```json
{
  "orderId": "<id de la orden>",
  "rating": 5,
  "comment": "Excelente trabajo, muy recomendado."
}
```

- **rating:** 1 a 5.
- **comment:** Opcional.
- Solo una reseña por orden y solo el comprador.

---

## Estados de la orden (referencia)

| Estado             | Significado                          |
|--------------------|--------------------------------------|
| PENDING_PAYMENT    | Orden creada, falta pagar           |
| PAID               | Pagado, el vendedor puede trabajar  |
| IN_PROGRESS        | En proceso                           |
| DELIVERED          | Vendedor entregó, comprador revisa   |
| COMPLETED          | Comprador aprobó, orden cerrada      |
| CANCELED           | Cancelada                            |
| DISPUTED           | En disputa                           |

---

## Orden sugerida de llamadas (comprador)

1. `GET /api/v1/services/:id` — Ver servicio  
2. `POST /api/v1/orders` — Crear orden  
3. `POST /api/v1/payments/mercadopago/preference` — Obtener link de pago  
4. Redirigir a Mercado Pago → usuario paga  
5. Usuario vuelve a `/payment/success` (o pending/failure)  
6. `GET /api/v1/orders` o `GET /api/v1/orders/:id` — Ver orden (ya PAID)  
7. `GET /api/v1/chats` y `GET /api/v1/chats/:chatId` — Ver/responder chat  
8. `GET /api/v1/deliveries/order/:orderId` — Ver entregas de la orden  
9. `POST /api/v1/deliveries/:id/approve` o `request-revision`  
10. Cuando la orden esté COMPLETED: `POST /api/v1/reviews` — Dejar reseña  

Con esto el front tiene el paso a paso completo para “contratar un servicio” de punta a punta.
