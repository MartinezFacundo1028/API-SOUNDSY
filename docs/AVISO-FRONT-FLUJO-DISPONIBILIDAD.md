# Aviso para Frontend: Flujo "Preguntar disponibilidad"

El backend ya soporta el flujo **Preguntar disponibilidad → Chat → Aprobación → Pago**. Resumen de lo que pueden usar y qué cambió.

---

## 1. Crear orden como solicitud (sin pago)

**POST** `/api/v1/orders` (o la base URL que usen)

- **Body:** mismo que antes, más un campo opcional:
  ```json
  {
    "serviceId": "...",
    "sellerId": "...",
    "amount": 123,
    "currency": "USD",
    "asRequest": true
  }
  ```
- Si envían **`asRequest: true`**, la orden se crea con **`status: "REQUESTED"`** y se crea el chat igual que antes.
- Si no envían `asRequest` (o es `false`), la orden se crea con **`status: "PENDING_PAYMENT"`** (flujo directo a pago).
- La respuesta incluye **`order.chatId`** y **`order.status`** para redirigir al chat o a “Mis órdenes”.

---

## 2. Aprobar la solicitud (solo músico)

Hay **dos formas** (pueden usar la que prefieran):

### Opción A – Endpoint dedicado (recomendado)

**PATCH** `/api/v1/orders/:orderId/approve-request`

- **Sin body** (o body vacío).
- Solo el **vendedor** de la orden (o admin) puede llamarlo.
- Solo funciona si la orden está en **`REQUESTED`**. La pasa a **`PENDING_PAYMENT`**.
- Respuesta: la orden actualizada con `status: "PENDING_PAYMENT"`.

### Opción B – PATCH genérico

**PATCH** `/api/v1/orders/:orderId`

- **Body:** `{ "status": "PENDING_PAYMENT" }`
- Misma regla: solo el vendedor (o admin) puede hacer esta transición cuando la orden está en `REQUESTED`.

---

## 3. Cancelación

- Órdenes en **`REQUESTED`**: pueden cancelar **comprador o vendedor** (DELETE `/api/v1/orders/:id`).
- Órdenes en **`PENDING_PAYMENT`**: solo el **comprador** puede cancelar (igual que antes).

---

## 4. Pagos (Mercado Pago)

- **POST** `/api/v1/payments/mercadopago/preference` solo funciona si la orden está en **`PENDING_PAYMENT`**.
- Si la orden está en **`REQUESTED`**, el backend responde **400** con:
  - `"La orden debe ser aprobada por el músico antes de pagar"`.
- Conviene mostrar ese mensaje en el front cuando el usuario intente pagar sin que el músico haya aprobado.

---

## 5. Resumen de flujo sugerido en el front

1. Usuario hace clic en **“Preguntar disponibilidad”** → **POST /orders** con `asRequest: true` → redirigir a chat (usando `order.chatId`) o a “Mis órdenes”.
2. Músico ve la solicitud → **PATCH /orders/:id/approve-request** (o PATCH con `{ status: "PENDING_PAYMENT" }`).
3. Cliente ve “Pagar” solo cuando `order.status === "PENDING_PAYMENT"` → Checkout → **POST /payments/mercadopago/preference** con `orderId`.

Cualquier duda, preguntar al backend.
