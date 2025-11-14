# Visualizador 3D de Rutas Aéreas Globales
Simulación interactiva con Three.js que muestra rutas aéreas, aviones animados, cambio de datasets y sistema anti-solapamiento.

Proyecto realizado por Jesús Alberto Ortega Hernández.

---

# Descripción general
Este proyecto visualiza sobre un globo terráqueo 3D distintas rutas aéreas tomadas desde archivos CSV.  
Los aviones siguen trayectorias curvas realistas, y en cada destino se genera una bandera 3D interactiva con tooltip.  

También permite cambiar dinámicamente entre distintos datasets usando dat.GUI sin recargar la página.

---

# Tecnologías utilizadas
- Three.js  
- OrbitControls  
- GLTFLoader  
- dat.GUI  
- CSV como fuente de datos  
- JavaScript ES6+  

---

# Variables globales
Variables necesarias para la escena, cámara, rutas, animaciones, tooltip, datasets y GUI.  
Toda la lógica del sistema se apoya en estas estructuras globales.

---

# Funciones en detalle

## init()
Inicializa toda la aplicación:

1. Crea escena, cámara y renderer  
2. Configura OrbitControls  
3. Añade luz solar y luz ambiental  
4. Crea fondo estelar  
5. Crea la Tierra y la esfera de nubes  
6. Genera tooltip HTML  
7. Configura panel dat.GUI para cambiar dataset  
8. Carga modelos GLB (aviones y bandera)  
9. Carga las rutas CSV iniciales  
10. Genera las primeras rutas animadas  
11. Añade listener de resize  

Esta función es el punto de inicio del sistema.

---

## crearFondoEstrellas()
Genera una esfera gigante invertida con una textura de estrellas.  
Esto simula el espacio profundo alrededor de la Tierra.

---

## crearTierra()
Crea una esfera con la textura nocturna de la Tierra.  
Esta esfera rota en el loop de animación para simular la rotación del planeta.

---

## crearNubes()
Crea una segunda esfera apenas más grande que la Tierra, con textura de nubes.  
Posee transparencia mediante alphaMap.  
Rota un poco más rápido que la Tierra para dar sensación de atmósfera dinámica.

---

## crearTooltip()
Crea un elemento div HTML que se usará como tooltip.  
Permanece oculto salvo cuando el usuario pasa el ratón por encima de una bandera.

---

## onMouseMove()
Actualiza la posición del ratón:

- Para interactuar con banderas usando raycaster  
- Para colocar correctamente el tooltip en la pantalla  

---

## cargarCSV()
Lee el archivo CSV indicado y convierte cada línea en un objeto de la forma:

{
origin: { iata, lat, lon },
dest: { iata, lat, lon }
}


Se usa tanto para el dataset inicial como para cambiar de dataset desde la GUI.

---

## cargarTodasLasRutas()
Carga el CSV actual (rutaActual) y reinicia el índice interno.  
Esta función permite reutilizar un mismo motor de animación con distintos datasets.

---

## cambiarDataset()
Permite cambiar dinámicamente al dataset elegido desde el menú dat.GUI.

Pasos:
1. Actualizar rutaActual  
2. Cargar el nuevo CSV  
3. Eliminar aviones, líneas y banderas actuales  
4. Vaciar arreglos de animación  
5. Generar nuevas rutas con el nuevo dataset  

Con esto no hace falta recargar la página para mostrar nuevas rutas.

---

## latLonToVector3()
Convierte latitud y longitud geográficas en coordenadas 3D sobre una esfera.  
Es una función clave: se usa para posicionar aeropuertos, aviones, banderas y curvas de ruta.

---

## cargarModelosAvion()
Carga modelos GLB:

- Airplane.glb para vuelos largos  
- ruta_pequeña.glb para vuelos cortos  
- Flag.glb para banderas de destino  

Se configuran escala y rotación base para cada modelo.

---

## elegirModeloAvion()
Determina el tipo de avión:

- Si la distancia angular entre origen y destino es grande → avión grande  
- Si es corta → avioneta pequeña  

Esto imita la diferencia entre vuelos internacionales y regionales.

---

## crearRuta3D()
Es la función más importante del sistema.

Hace lo siguiente:

1. Convierte coordenadas geográficas a posiciones 3D  
2. Calcula un punto medio elevado entre origen y destino  
3. Detecta si otra ruta ya existente es demasiado cercana  
4. Si está cerca, aplica una desviación aleatoria  
5. Construye una curva Catmull–Rom con 200 puntos  
6. Crea una línea 3D usando LineDashedMaterial  
7. Clona el modelo de avión, lo orienta hacia destino y lo coloca al inicio de la ruta  
8. Añade el avión, la línea y la curva al sistema de animación  
9. Llama a colocarBandera() para poner una bandera en el destino  

Esta función define la estética y el comportamiento de las rutas aéreas.

---

## colocarBandera()
Clona el modelo GLB de la bandera, lo orienta con la normal de la superficie terrestre y añade un pequeño desplazamiento hacia afuera del planeta.  
Asigna un texto (ejemplo: "MAD → JFK") para mostrarse en el tooltip.  
Añade la bandera al array de marcadores.

---

## cargarPrimerasRutas()
Carga 10 rutas del CSV para no saturar la escena.  
Cada vez que se recargan rutas, se utiliza este método.

---

## recargarSiLlegan()
Este sistema detecta cuando todos los aviones han alcanzado el destino.  
Cuando esto ocurre:

1. Se eliminan aviones  
2. Se eliminan curvas  
3. Se eliminan banderas  
4. Se vacían los arrays  
5. Se cargan otras 10 rutas nuevas  

Genera una animación infinita rotativa entre los datos del dataset.

---

## animate()
El loop principal del programa.  
Realiza cada frame:

- Rota la Tierra  
- Rota la esfera de nubes  
- Actualiza posición de cada avión recorriendo la curva  
- Comprueba si todas las rutas han terminado  
- Usa el raycaster para detectar banderas  
- Actualiza y muestra el tooltip si corresponde  
- Renderiza la escena final  

Sin esta función el sistema no tendría movimiento.

---

# Selector de dataset (dat.GUI)
Permite cambiar en tiempo real entre:

- Mes 0  
- Mes 1  

Código utilizado:



gui = new dat.GUI();
gui
.add(opciones, "dataset", ["Mes 0", "Mes 1"])
.name("Dataset")
.onChange(value => cambiarDataset(rutasMap[value]));


Esto permite visualizar rutas diferentes sin reiniciar la aplicación.

---

# Algoritmo anti-solapamiento
Dentro de crearRuta3D(), se analiza la distancia entre rutas ya generadas.  
Si la nueva ruta está demasiado cerca de una existente, se aplica una desviación:



if (midDist < 0.5) {
desviacion = new THREE.Vector3(
(Math.random() - 0.5) * 0.8,
(Math.random() - 0.5) * 0.4,
(Math.random() - 0.5) * 0.8
);
}


Con esto se evitan líneas montadas unas sobre otras, mejorando la visualización.

---

# Conclusión
Este proyecto es un visualizador 3D completo de rutas aéreas globales, combinando:

- Gráficos 3D  
- Animaciones avanzadas  
- Modelos GLB  
- Carga dinámica de datasets  
- Interacción con mouse y tooltip  
- Algoritmo inteligente anti-solapamiento  
