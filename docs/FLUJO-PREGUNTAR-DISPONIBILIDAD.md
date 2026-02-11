# Flujo: Preguntar disponibilidad → Chat → Aprobación → Pago

Este documento describe los cambios necesarios en el **backend** para soportar el flujo donde el cliente primero pregunta disponibilidad, chatea con el músico, el músico aprueba la solicitud y recién entonces el cliente puede pagar.

---

## Resumen del flujo deseado

1. **Cliente** ve un servicio y hace clic en **"Preguntar disponibilidad"** (en lugar de "Pagar" directo).
2. Se crea una **solicitud** (orden en estado especial) y se crea el **chat** entre cliente y músico.
3. Cliente y músico **chatean** para aclarar fechas, detalles, etc.
4. El **músico** envía una **aprobación** de la solicitud.
5. Recién entonces el **cliente** ve el botón **"Pagar"** y puede ir al checkout con Mercado Pago.

---

## Cambios en el backend

### 1. Nuevo estado de orden: `REQUESTED`

**Prisma (`prisma/schema.prisma`)**

En el enum `OrderStatus` agregar:

```prisma
enum OrderStatus {
  REQUESTED        // NUEVO: solicitud enviada, esperando confirmación del músico
  PENDING_PAYMENT
  PAID
  IN_PROGRESS
  DELIVERED
  COMPLETED
  CANCELED
  DISPUTED
}
```

Generar migración:

```bash
npx prisma migrate dev --name add_requested_order_status
```

---

### 2. Crear orden como solicitud (sin pago aún)

**Opción A (recomendada):** Añadir un campo opcional al DTO de creación.

**`src/orders/dto/create-order.dto.ts`**

Agregar import de `IsBoolean` y `IsOptional` desde `class-validator`, y el campo:

```ts
@IsBoolean()
@IsOptional()
asRequest?: boolean;  // si true, la orden se crea con status REQUESTED
```

**`src/orders/orders.service.ts` – `createOrder`**

- Si `dto.asRequest === true`, crear la orden con `status: OrderStatus.REQUESTED`.
- Si no, mantener `status: OrderStatus.PENDING_PAYMENT` como hasta ahora.
- En ambos casos se crea el chat asociado a la orden (igual que hoy).

**Opción B:** Nuevo endpoint `POST /orders/request` con el mismo body que `POST /orders`, que cree siempre con `REQUESTED`. La opción A evita duplicar lógica.

---

### 3. Aprobación de la solicitud (músico)

Solo el **vendedor** (músico) puede pasar una orden de `REQUESTED` a `PENDING_PAYMENT`.

**`src/orders/orders.service.ts` – `updateOrder`**

Al actualizar el `status`:

- Si el estado actual es `REQUESTED` y el nuevo es `PENDING_PAYMENT`:
  - Permitir **solo si** `userId === order.sellerId` (el músico).
  - Si quien llama es el comprador o otro rol, devolver `403 Forbidden`.
- Para el resto de transiciones de estado, mantener la lógica actual según reglas de negocio.

**Opcional:** Endpoint dedicado para claridad:

- `PATCH /orders/:id/approve-request`  
  - Solo vendedor.  
  - Solo si `order.status === REQUESTED`.  
  - Actualiza a `PENDING_PAYMENT`.

---

### 4. Cancelación de órdenes en estado REQUESTED

**`src/orders/orders.service.ts` – `deleteOrder`**

Hoy solo se puede cancelar si `order.status === PENDING_PAYMENT`. Ampliar a:

- Permitir cancelar también si `order.status === REQUESTED` (tanto comprador como, si se desea, vendedor).

---

### 5. Pagos (Mercado Pago)

**`src/payments/payments.service.ts`** (y donde se cree la preferencia de Mercado Pago)

- Solo generar preferencia / permitir pago si `order.status === PENDING_PAYMENT`.
- Si la orden está en `REQUESTED`, devolver error claro (ej. 400: "La orden debe ser aprobada por el músico antes de pagar").

Esto ya está alineado con la lógica actual; solo asegurarse de no permitir flujo de pago para `REQUESTED`.

---

### 6. Resumen de reglas

| Acción                    | Quién    | Estado actual   | Nuevo estado     |
|---------------------------|----------|------------------|-------------------|
| Crear orden (normal)      | Comprador| —                | PENDING_PAYMENT   |
| Crear orden (solicitud)   | Comprador| —                | REQUESTED         |
| Aprobar solicitud         | Vendedor | REQUESTED        | PENDING_PAYMENT   |
| Pagar (Mercado Pago)      | Comprador| PENDING_PAYMENT  | (webhook → PAID)  |
| Cancelar orden            | Comprador| PENDING_PAYMENT o REQUESTED | (orden eliminada o CANCELED) |

---

### 7. Respuestas de la API

- **GET /orders** y **GET /orders/:id**: incluir órdenes con `status: "REQUESTED"` y devolver el campo `status` con el nuevo valor.
- **POST /orders**: si se envía `asRequest: true`, la respuesta debe tener `status: "REQUESTED"` y `chatId` para que el frontend abra el chat.

---

## Flujo de llamadas desde el frontend

1. Cliente en detalle del servicio → **POST /orders** con `{ serviceId, sellerId, amount, currency, asRequest: true }` → 201 con `order` (con `chatId`, `status: "REQUESTED"`).
2. Frontend redirige a **Mis órdenes** (o a la vista de chat con `order.chatId`) para que cliente y músico chateen.
3. Músico en **Mis órdenes** ve la solicitud → **PATCH /orders/:id** con `{ status: "PENDING_PAYMENT" }` (o **PATCH /orders/:id/approve-request**).
4. Cliente ve "Pagar" → va a **Checkout** con `orderId` → **POST /payments/mercadopago/preference** con `orderId` → redirección a Mercado Pago.

Con estos cambios en el backend, el frontend puede implementar el flujo completo "Preguntar disponibilidad → Chat → Aprobación → Pago".
