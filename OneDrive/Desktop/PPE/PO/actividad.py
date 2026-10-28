# datos personales taller

# datos
nombre = input("Ingrese su nombre: ")
apellido = input("Ingrese su apellido: ")
curso = input("Ingrese su curso: ")
edad = int(input("Ingrese su edad: "))

# salto de linea
print("\n--- DATOS DEL ESTUDIANTE ---")

# aquí se muestran los datos
print("Nombre completo:", nombre, apellido)
print("Curso:", curso)
print("Edad:", edad, "años")

# condiciones
if edad >= 18:
    print("Estado del estudiante:", nombre, "es MAYOR de edad.")
else:
    print("Estado del estudiante:", nombre, "es MENOR de edad.")



