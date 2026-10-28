# Taller pedido comida

# datos
cliente = input("Ingrese el nombre del cliente: ")
comida = input("¿Qué comida desea pedir?: ")
bebida = input("¿Qué bebida desea?: ")
cantidad = int(input("Ingrese la cantidad de porciones: "))
precio_unitario = float(input("Ingrese el precio por unidad: "))

# calcular precio
subtotal = cantidad * precio_unitario

print("\n--- DETALLE DEL PEDIDO DE COMIDA ---")
print("Cliente:", cliente)
print("Comida:", comida)
print("Bebida:", bebida)
print("Pedido:", cantidad, "x", comida)
print("Subtotal a pagar: $", subtotal)

# descuento para ver si me ponen un punto en la materia ( necesito un punto 🥺 pls!! )
if subtotal >= 20.0:
    print("Estado del pedido: ¡Felicidades! Su pedido aplica para ENVÍO GRATIS.")
elif subtotal >= 10.0:
    print("Estado del pedido: Su pedido califica para un descuento del 10% en su próxima compra.")
else:
    print("Estado del pedido: Pedido estándar. Costo de envío: $2.00 adicionales.")
