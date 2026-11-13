# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- **El alta sigue el diseño de la pantalla de registro**, tanto desde Mi resumen como desde cualquier otro lado: el stepper de círculos con íconos, etiquetas y conectores pasa a **una sola barra que se llena**. El anterior pedía un ancho que 390px no da —las etiquetas se partían—. No lleva leyenda: "Paso 2 de 4 · Verificar" no se lee como ayuda sino como trámite, y encima repetía lo que ya dice el encabezado que tiene justo arriba. Lo único que agregaba —cuánto falta— es exactamente lo que muestra la barra, y el dato sigue estando para quien no la ve, anunciado como `progressbar`. La barra mide los pasos que quedaron atrás y no el que tenés delante, así que el último cuarto lo cierra el registro aceptado y no el formulario abierto; si falla, vuelve atrás junto con el error. Aparece **solo en el alta**: quien ya tiene cuenta escribe una dirección y una contraseña, y ahí no hay recorrido que contar.
- **Se va el botón "Volver" de cada paso**: con la flecha en el encabezado había dos caminos de vuelta para lo mismo. Queda uno.
- **Flecha de volver en el encabezado**, junto a la cruz: la cruz cierra todo, que no es lo que quiere alguien que se equivocó un paso atrás.
- **"Cambiar correo" en el paso del código**, con lápiz, justo debajo de la dirección. Vuelve al paso del correo con la dirección todavía cargada.

- **La pantalla sin sesión sigue el artboard "App · Sin sesión"**: el argumento ocupa la pantalla —título, dos placas en abanico y el cartel que contesta por qué pedimos una cuenta— y el formulario es un panel apoyado en el borde de abajo. El panel renderiza el `EmailStep` de verdad y no una copia: el correo que se escribe ahí se le entrega al flujo de alta que ya existe, que sigue siendo el único.
- **Al avanzar del correo, el alta se abre como un panel desde el mismo borde**, con las mismas esquinas, para que se lea como ese panel creciendo en lugar de una tarjeta apareciendo encima. Es una variante del modal de siempre: donde se abre desde la grilla o streamers no cambia nada.
- **El modal recibe por dónde se entró** (`initialEmail`, `social`), así que a nadie se le pide dos veces el mismo correo.
- **El panel del formulario queda despegado del cartel**, como en el artboard, y en una pantalla más corta que el diseño lo que cede es el abanico y no el texto: el abanico ya es un recorte a propósito y perder un poco más no cuesta nada, media frase cortada se ve rota.

### Changed

- **Mi resumen dice en qué parte del calendario está**: una pastilla arriba del carrusel con lo que estás viendo y lo que viene — "Semana pasada · Nuevo resumen el viernes a las 18 hs", "Lunes a viernes · Mañana se suma el sábado". El rango de fechas solo no alcanzaba: de lunes a jueves lo que se muestra es la semana pasada, y un resumen viejo sin explicación se lee como un resumen roto. La frase sale del rango que manda la API y no del reloj del teléfono, así que uno con otro huso no puede nombrar el día equivocado.
- **El aviso dice lo mismo en menos palabras que en la web**, que es lo que entra en el ancho de un teléfono con una pastilla de un renglón: "Nuevo resumen el viernes 18 hs" contra "a las 18 hs", "Cierra mañana" contra "El cierre sale mañana", "Mes hasta hoy" contra "Tu mes hasta hoy". En 390px la versión larga se pasaba del final y quedaba cortada. Los otros estados se leen idénticos.
- **La espera sobre un período ya publicado no anuncia la hora de cierre**: a quien no miró nada no le sirve el plazo de un resumen que va a estar vacío igual. Queda una sola frase, la que dice qué hacer, y el botón debajo lo hace. La hora de cierre vive en la pastilla, que es donde hay un resumen que cerrar.
- **La espera sobre un período ya abierto toma las fechas del servidor**, en lugar de recalcularlas: un domingo mostraba "2 — 6 de noviembre", que es la entrega del viernes, cuando la vigente ya llegaba al sábado. Y deja de nombrar el día cuando el día es hoy — "se completa hoy a las 22 hs" y no "el domingo", que se leía como el domingo que viene.
- **Se va el contador de reproducciones de la pantalla de espera**. El mínimo de tres ya no existe —la única regla es el calendario— y el contador además mentía: de lunes a jueves prometía que unas reproducciones más llenaban una semana que ya había cerrado. En su lugar dice cuándo llega el próximo resumen y con qué días se arma, y el encabezado muestra esas fechas y no las del período cerrado que quedó atrás.

### Fixed

- **El menú de compartir ofrece las apps correctas.** Sugería Notas, Recordatorios y Freeform en lugar de WhatsApp, porque la vía anterior etiquetaba el archivo con un tipo propietario de WhatsApp (`net.whatsapp.image`) sobre un archivo escrito como `.jpg`: el tipo y la extensión no coincidían, iOS no podía resolverlo y caía en las apps que aceptan archivos genéricos. Yendo derecho al menú con el `.png` y su tipo real, iOS lo resuelve a `public.png` y aparecen las que reciben imágenes. Va también la placa sola, sin texto al lado: un paquete de dos piezas no lo toman completo todas las apps, y hay varias que se quedan con el texto y sueltan la imagen.
- **WhatsApp va directo al menú de compartir, que es donde terminaba igual.** Tiene una vía propia para recibir archivos y la usábamos; el log del dispositivo muestra que funcionaba, sin un solo rechazo. Lo que pasa es que Apple reemplazó el viejo menú "Abrir en…" —el que esa vía abría— por el menú de compartir, así que desembocaba ahí después de leer el archivo y copiarlo a un temporal para nada. No hay otra puerta: el esquema `whatsapp://` lleva texto y no archivos. Entregarle una imagen a WhatsApp en iOS **es** el menú, y ahora el código lo dice en lugar de descubrirlo cada vez.
- **Lo que destrabó iOS no toca Android.** Mandar la placa como archivo con extensión propia y en base64 es lo que hace que iOS ofrezca WhatsApp y X; en Android esas dos cosas sólo rompen, porque un nombre con una extensión que no conoce no tiene a qué app ofrecérselo. Android vuelve a dirigir el envío con un intent a la app concreta, que es como funcionaba y por qué nunca tuvo el problema que tuvimos en iOS.
- **En el menú de compartir aparecen WhatsApp y X**, que antes no figuraban ni deslizando: iOS ofrecía Notas, Recordatorios y Freeform. Son dos cosas. Se excluyen las acciones del sistema —AirDrop, Mail, Mensajes— que no vienen al caso cuando alguien tocó el botón de una red social, y la placa viaja como archivo y no como imagen, que es al revés de lo que uno esperaría: con un `.png` esas dos apps desaparecen del menú y con un archivo genérico aparecen las dos. El precio es que la lista también trae apps que aceptan cualquier cosa, lo que parece mejor que no tener las que la persona fue a buscar. El orden dentro de la fila no es nuestro: lo decide iOS según con quién compartís desde cada app, así que WhatsApp arranca lejos y sube con el uso.
- **Todos los botones de compartir llevan la placa.** Facebook la recibe como historia, por el mismo mecanismo que Instagram y con el mismo App ID —el muro necesitaría el SDK de Facebook—; X y WhatsApp salen por el menú del sistema, donde sus extensiones la toman. Antes X y Facebook abrían su compositor con un enlace: directo, pero dejaba afuera la imagen, que es el punto. Ninguno de los dos tiene vía propia para recibirla, así que es un toque más a cambio de mandar lo que se quería mandar. Hizo falta declarar `facebook-stories` entre los esquemas: es distinto de `fb`, y sin él iOS contesta que la app no está instalada aunque lo esté.
- **X y Facebook abren su propio compositor en lugar del menú del sistema**: les pasábamos el PNG de la placa, y ninguno de los dos acepta una imagen por vía pública — por eso fallaba y caía ahí. Ahora reciben un enlace y una línea de texto, que es lo que sí toman. WhatsApp es distinto y sigue recibiendo la placa: tiene una vía propia para archivos y es la que usamos. El enlace lleva a Mi resumen, que a quien no tiene cuenta le explica qué es y lo invita a abrirse una. X además no hacía nada: lo buscábamos por su esquema `twitter://`, que iOS nunca nos contestó, así que ni lo intentaba; ahora se abre por el enlace que su app reclama, y si no está instalada lo atiende el navegador. La placa sigue saliendo entera por Instagram y por Descargar.

- **Las placas del resumen no cargaban cada tanto, sobre todo en el mensual**: el limpiador de cache borraba las placas del *otro* período. Abrir el mes borraba las de la semana, volver a la semana borraba las del mes, y la pantalla —que recuerda lo que descargó— las daba por bajadas y no las volvía a pedir, dibujando el recuadro vacío. Ahora sólo borra entregas viejas del mismo período, que es lo que decía hacer, y la pantalla le pregunta siempre al servicio, que responde al instante si el archivo sigue en disco.

- **El teclado tapaba el formulario en la pantalla sin sesión**, en los dos sistemas: el panel está apoyado en el borde de abajo, que es justo de donde sube el teclado, y no había ningún manejo. Android pide `adjustResize` en el manifiesto, pero la app dibuja de borde a borde y eso deja sin efecto el redimensionado, así que no alcanzaba con arreglarlo en iOS. Mientras el teclado está arriba el argumento se retira entero y el panel toma la pantalla: encoger sólo el abanico no servía, porque el título, el texto y el cartel son unos 190px que no ceden, y lo que queda sobre el teclado tiene que alcanzar para el formulario completo con su botón.
- **Terminar el registro desde Mi resumen dejaba un "No pudimos traer tu resumen"**: la pantalla ya está montada mientras se muestra el argumento a quien no tiene cuenta, así que el pedido del resumen salía sin token, volvía 401 y dejaba su error guardado. Al crearse la sesión la vista cambiaba, pero nadie volvía a pedir —el efecto dependía sólo del período—, y había que salir de la pestaña y volver. Ahora depende también del token: sin sesión no pide nada, y cuando la sesión aparece pide solo.
- **El paso del código se ve centrado**, como venía en producción: la frase del correo, el "Cambiar correo" y los seis casilleros. Alinearlos a la izquierda seguía el artboard, pero contra el botón —que ocupa todo el ancho— se leía desprolijo. Y la primera línea de cada paso deja de apoyarse sobre la barra de progreso.
- **En Android el formulario del registro quedaba centrado en el panel**, con un vacío arriba del encabezado, mientras que en iOS arrancaba arriba. Al sacar el `flex` que rompía iOS, el contenido dejó de reclamar el alto del panel y cada plataforma lo alineó a su manera. Ahora está puesto explícitamente: arriba en las dos.
- **El panel del registro se abría vacío en iOS**: debajo del título no se dibujaba nada. Era el `flex: 1` que le habíamos puesto al `KeyboardAvoidingView` y al `ScrollView` para poder anclar el botón al borde de abajo; dentro del modal de react-native-paper ese anidamiento colapsa en iOS y se lleva el contenido. Android lo tolera, que es por qué hizo falta un teléfono para verlo. El botón vuelve a ir debajo del contenido.
- **El paso del código se veía flotando en medio de un panel vacío**: ni el `KeyboardAvoidingView` ni el `ScrollView` reclamaban el alto, así que un paso que apoya su botón en el borde de abajo no encontraba borde donde apoyarlo y el formulario entero quedaba centrado, con cientos de pixeles vacíos arriba y abajo. Ahora el contenido arranca arriba y el botón vive en el borde inferior, con el reenvío debajo, como en el artboard.
- **La frase "Ingresá el código que recibiste en" salía verde**: usaba `theme.colors.secondary`, que en este tema es el verde de marca (`#10B981`) y no el gris de texto secundario. Pasa a `onSurfaceVariant`.
- **El panel del correo respiraba más que el artboard**: 16 de separación entre filas, más 8 extra arriba del botón y 8 a cada lado de la "o". Pasa a los 10 parejos del diseño, con el campo en sus 48px. Son unos 50px que se lleva el abanico, que es la parte de esa pantalla que alguien mira.
- **Quedaba un hueco entre el cartel y el panel del formulario**: el abanico tenía alto fijo, así que lo que sobraba se juntaba todo ahí abajo. Se nota sobre todo en Android, donde el alto útil de la pantalla es mayor que el que el diseño necesita — iOS pierde bastante con la isla dinámica y el indicador de inicio, así que ahí no sobra nada. Ahora el abanico toma ese espacio en lugar de dejarlo vacío —hasta donde terminan las placas de verdad, no más— y de paso escala con el ancho de la pantalla en lugar de quedarse clavado en los 390 del artboard con la pantalla alrededor sin usar.
- **La barra de progreso iba al ancho del panel y no del contenido**: su inset ahora lo decide quien la monta, así que se alinea con lo que mide.

### Changed

- **Google y Apple van uno al lado del otro**, con el nombre del proveedor solo. Dos filas enteras cuestan unos 54px de alto que ni la pantalla sin sesión ni el modal en un teléfono chico tienen de sobra, y el logo carga el resto del significado. En Android, donde sólo se ofrece Google, el botón simplemente ocupa la fila.

### Added

- **La pestaña de Mi resumen está siempre**, con sesión o sin ella. Antes se escondía a quien no tenía cuenta, que es justo quien no vio nunca el motivo más fuerte para abrirse una. Un visitante ahora encuentra el abanico de placas, qué es la sección y un botón que lo lleva al alta. La entrada a la cuenta sigue siendo el modal que la app ya tiene: a diferencia del sitio, que pone el formulario como mitad de la pantalla, en un teléfono no hay dos mitades que repartir.

---

## [1.1.0] - 2026-10-31

### Added
- **Tocar el aviso de "llegó tu resumen" abre Mi resumen**: la push que manda el backend viaja con `data.type = recap`, y la app la encamina tanto si estaba en segundo plano como si arrancó desde cero — en ese segundo caso con la misma espera que ya usaba el camino de streamers, porque el navegador de pantallas no está listo en el instante en que la app abre.
- **Dos interruptores en el perfil** para apagar los avisos de resumen semanal y mensual por separado. Son optimistas: el switch se mueve con el dedo y vuelve solo si la llamada falla, porque esperar un viaje de red para animar un toggle hace sentir rota la app, y equivocarse por un momento cuesta a lo sumo un aviso.

---
- **Cada perfil de build declara de qué entorno de EAS lee sus variables** (`environment` en `eas.json`): los perfiles traían el `APP_VARIANT` pero no decían si tomaban las variables de `production`, `preview` o `development`, y la documentación de Expo no define qué pasa cuando falta. Con `FACEBOOK_APP_ID` entrando en juego eso dejó de ser aceptable: un build sin la variable compila igual y el botón de Instagram cae en la hoja del sistema sin ningún error visible, que es exactamente la clase de falla que no se descubre hasta tener la app publicada.
- **La placa cacheada se identifica por los dos extremos del período**: ahora que el resumen se publica por tandas —viernes, sábado y domingo—, una misma semana produce tres placas distintas que arrancan todas el mismo lunes. El nombre del archivo sólo llevaba el día inicial, así que la del viernes se servía todo el fin de semana, con una fecha impresa que ya no coincidía con la de la pantalla alrededor. Se suma el día final al nombre, y al bajar una tanda nueva se borran las anteriores de ese mismo período: si no, el caché guardaba todas las versiones de todas las semanas para siempre.
- **El estado de "todavía no alcanza" pasa a ser el diseño de Paper**: una placa vacía de contorno punteado, el texto debajo, la barra de progreso y el acceso a la grilla en vivo, en lugar de dos líneas centradas. El marcador dice contra qué: "Vas 1 de 3 reproducciones" con la meta al costado, que es la misma `minimum_plays` que manda la API. El contorno punteado va en SVG: React Native lo dibuja sólido en Android apenas la vista tiene esquinas redondeadas. La placa vacía toma el alto que le queda libre hasta el tamaño del diseño, así que entra arriba de la barra de pestañas sin scroll en cualquier teléfono.
- **El aviso de "Llegó tu resumen" también en la app, en formato bandeja**: la misma pieza que el sitio —las tres placas abiertas en abanico, el chip NUEVO, el título en Outfit 800 y el botón de ancho completo—, subiendo desde el borde de abajo. Bloquea la app hasta que se acepta o se cierra sesión, y la aceptación se guarda en el mismo registro del backend (`seen_features`, versionado) que lee el sitio, así que responderlo en cualquiera de los dos lados alcanza para los dos. Dos cosas no se pudieron copiar tal cual del diseño: React Native rota siempre alrededor del centro de la vista y el artboard rota cada placa alrededor de su esquina, así que las posiciones están reexpresadas para ese pivote; y no hay gradientes radiales, así que el charco de luz debajo del abanico va en SVG. El título se dimensiona contra el ancho de la pantalla para entrar siempre en una línea.
- **"Mi resumen" en la app**: la cuarta pestaña, visible solo con sesión iniciada, con el mismo layout que la web mobile: selector de semana/mes, las cuatro placas como carrusel con snap y la siguiente asomando al costado, y debajo el epígrafe y los botones por red social. **La placa no se vuelve a dibujar**: es un componente que el sitio renderiza a 1080x1920 y exporta como PNG, y la app descarga ese PNG. Maquetarla de nuevo en React Native la habría convertido en una tercera implementación que se desincroniza al primer ajuste, que es exactamente lo que se evitó en la web haciendo que la tarjeta y la imagen compartible sean el mismo componente. La ruta del sitio acepta ahora el JWT del backend, que es el token que la app ya tiene. Las cuatro se bajan de a una apenas llega el resumen y quedan en el cache en disco, así que compartir es instantáneo.
- **Botones por red social, cada uno por el camino más directo que esa red permite**, que no es el mismo para todas. Instagram acepta un handoff a Stories, pero sólo contra un Facebook app id registrado (`FACEBOOK_APP_ID`); sin él ese botón cae en la hoja del sistema. WhatsApp, X y Facebook aceptan la imagen por su propio intent. "Guardar" la manda al carrete. Si una app no está instalada se dice; si el handoff falla queda la hoja del sistema; y cancelar no dice nada, porque cancelar es una decisión y no un error. TikTok no está: su API de compartir vive detrás de su SDK y una client key registrada, y sin eso el botón sólo podía abrir el feed.
- **El carrusel de banners se deformaba al dar la vuelta**: los clones del loop estan en los dos extremos del contenido, asi que envolver siempre toca el borde del scroll. Android 12+ responde a eso con su overscroll elastico, que estira el banner entero justo antes del salto al item real. iOS no rebota al hacer snap, pero un arrastre lento mas alla del clon igual se despegaba contra el fondo. Se desactivan `overScrollMode` y `bounces`.

- La sección usa el mismo fondo que el resto de la app en vez de uno más oscuro, los botones circulares pasan a ser azul oscuro macizo —antes su relleno era el color del fondo y los círculos se disolvían— y se van las etiquetas de abajo de cada botón, que el ícono ya dice. Al liberar ese alto, la placa crece sola: el tamaño sale de medir, no de una constante.

- Permiso de **escritura en la galería** (`NSPhotoLibraryAddUsageDescription` en iOS, `expo-media-library` en Android) para "Guardar" y para el camino de TikTok, y visibilidad de las apps destino (`LSApplicationQueriesSchemes` en iOS, `<queries>` en Android): sin declararlas, los dos sistemas responden que ninguna está instalada y todo cae siempre en la hoja del sistema.

---

## [1.0.20] - 2026-09-08

### Fixed
- **La flecha de volver podía dejar el panel en blanco**: retrocedía al paso del correo sin salir de la fase del flujo, y el campo de correo sólo se renderiza en la otra. Volver al primer paso ahora cierra el flujo, que es lo que hacía el botón que reemplaza.
- **La app de producción escuchaba los eventos en vivo de staging**: la URL del stream SSE (`/youtube/live-events`) estaba hardcodeada al backend de staging en todos los builds, producción incluida. Los cambios de estado en vivo del backend con el que la app realmente habla nunca le llegaban, así que la grilla solo se actualizaba cuando la pantalla recuperaba el foco de navegación. Ahora se deriva de `expoConfig.extra.apiUrl`, igual que el resto de las llamadas.
- **El botón "Ver en Youtube" aparecía cortado como "Ver en" en algunos Android**: la app empaqueta Inter, pero un `<Text>` sin `fontFamily` cae en la fuente del sistema, y ese label estaba estilado solo con `fontWeight`. En un dispositivo con una fuente de sistema más ancha (un font pack de Samsung o MIUI) el texto superaba el espacio que el layout había medido, envolvía a una segunda línea y el `overflow: 'hidden'` del contenedor la recortaba. Se declara `fontFamily: 'Inter_700Bold'` y `numberOfLines={1}`.
- **La app no recargaba al volver de segundo plano**: `loadData` corría únicamente desde `useFocusEffect`, que se dispara con el foco de *navegación* y no cuando se retoma la app. Una app dejada en segundo plano y abierta más tarde seguía renderizando el estado en memoria de la última vez que se usó — un usuario podía estar viendo la grilla de ayer, con el `is_live` congelado y el botón de "ver" apuntando a la playlist del canal en lugar del stream en vivo. Nada en pantalla lo delataba, porque la línea roja del "ahora" se calcula con el reloj real. Ahora un regreso a primer plano tras más de 2 minutos recarga los datos.
- **El cache de la grilla se servía sin límite de antigüedad**: `CacheService` calculaba si una entrada estaba vencida, pero los métodos `getCached*` ignoraban ese dato y devolvían lo que hubiera. Cuando el refresh fallaba de forma sostenida, una entrada de días atrás quedaba en pantalla como si fuera actual, mostrando la programación de otro día sin ninguna señal. Ahora se sirve igual para pintar al instante y para funcionar sin conexión, pero con un techo de 12 h para schedules (7 días para categorías, que no cambian): más allá se descarta y la pantalla espera datos reales en vez de mostrar algo engañoso. Además, una entrada vencida ya no marca la pantalla como cargada, así que el próximo foco vuelve a mostrar su estado de carga.
- **El refresh de tokens nunca funcionaba, dejando la sesión rota a los 7 días**: `api.post('/auth/refresh', null, ...)` hacía que axios serializara el body como el string literal `"null"`, y el parser JSON de Express lo rechazaba con `400 Unexpected token 'n', "null" is not valid JSON` antes de llegar al handler. Como consecuencia ningún access token podía renovarse y toda sesión quedaba inutilizable al vencer, 7 días después del login. El síntoma visible era la grilla vacía o desactualizada para usuarios logueados: los endpoints de schedules devolvían 401 con el token vencido y la app se quedaba con el cache viejo, o sin datos si el cache había sido invalidado. Ahora se envía `{}`.

---

## [1.0.19] - 2026-08-13

### Fixed
- **Deslogueo silencioso a los 7 días**: el par access/refresh se guardaba con dos escrituras secuenciales a `SecureStore`. Si la segunda fallaba, el dispositivo quedaba con access token y sin refresh token; una semana después vencía el access, el interceptor de 401 no encontraba refresh y destruía la sesión **sin siquiera llamar a `/auth/refresh`** — un logout sin ningún rastro del lado servidor. Ahora el par se persiste como un único valor JSON, así que la escritura es todo-o-nada y un estado a medio escribir no puede existir. Las sesiones creadas por builds anteriores se migran en la primera lectura, y las lecturas concurrentes del arranque se coalescen en una sola: sin eso la migración corría una vez por cada llamada simultánea (seis, medido en emulador) y quedaba una ventana en la que una lectura podía no ver ni la clave nueva ni las viejas y reportar "sin sesión" para un usuario logueado — lo que además habría desregistrado el dispositivo de las push.
- **Logout ante errores transitorios**: el `catch` del interceptor borraba los tokens ante *cualquier* fallo del refresh. Ahora solo un 401/403 del backend (o un refresh token genuinamente ausente) termina la sesión; sin conexión, 5xx, respuestas malformadas y fallos de storage dejan los tokens intactos. La escritura de tokens salió del bloque que dispara el logout: un refresh exitoso que no se llega a persistir ya no se confunde con un fallo de autenticación.
- **Push notifications tras el logout**: el registro de push se re-creaba justo después del teardown de sesión. `usePushNotifications` espera hasta 10s a que aparezca el token de FCM, y esa espera podía sobrevivir al logout; como `POST /push/fcm/subscribe` no requiere auth, la re-suscripción funcionaba aun sin sesión. Ahora se re-verifica el estado de auth después de la espera y se aborta si el backend rechaza la sesión.
- **Registro de push perdido por un corte de red**: `registerDevice` y `registerFCM` devolvían `null`/`false` tanto ante un 401 (sesión terminada) como ante un fallo transitorio, sin distinguirlos. Ahora devuelven un resultado tipado: un rechazo del backend aborta el registro, mientras que un fallo de red reintenta hasta 3 veces con backoff. Antes, como el efecto no se vuelve a disparar solo, un blip de red dejaba al dispositivo sin registro de push hasta el siguiente arranque de la app.
- **`onTokenRefresh` marcaba el dispositivo como registrado aunque el registro hubiera fallado**, porque `registerFCM` reporta el error por valor de retorno y no lanzando.
- **Dispositivos que quedaban suscriptos para siempre**: `clearSession()` solo corre en la *transición* de logueado a deslogueado, así que un dispositivo que perdía sus tokens entre arranques nunca se desregistraba. Se reconcilia el estado de push en el arranque, lo que además reintenta un unsubscribe que haya fallado al momento del logout. Los dispositivos ya afectados se reparan solos en el primer arranque de esta versión.

### Changed
- **Refresh proactivo al volver a foreground**: antes el refresh solo ocurría de forma reactiva ante un 401, así que los tokens rotaban como mucho una vez cada 7 días y la ventana de 14 días contaba desde el login y no desde el último uso — un usuario activo cada pocos días igual se deslogueaba el día 14. Ahora la sesión se renueva mientras la app se use.
- `registerDevice` ahora envía `platform` y `appVersion`. El backend siempre los aceptó pero nunca se mandaban, dejando `devices.app_version` en NULL para todas las filas e impidiendo saber qué builds siguen en uso.
- `refreshSession()` ya no vuelve a ejecutar todo el flujo de login (que disparaba un evento `login_success` en cada refresh) ni destruye la sesión ante cualquier error.

### Removed
- `src/services/auth.service.ts`, código muerto sin ninguna referencia.

---

## [1.0.18] - 2026-07-25

### Added
- **Zapping tutorial — 2 tooltips de onboarding**: se muestran en la primera apertura del reproductor un tooltip que apunta al botón de zapping, y al abrir el panel de zapping un segundo tooltip que indica que se puede cambiar de canal tocando uno de los canales en vivo. Ambos se persisten en `AsyncStorage` (claves `tooltip_zapping_player_v1` y `tooltip_zapping_panel_v1`) y, si el usuario está autenticado, se sincronizan con el backend vía `POST /users/me/seen-features` para no repetirse en otros dispositivos.

---

## [Unreleased]

### Added
- Datadog Mobile Session Replay enabled with 20% sample rate
- Timezone adaptation: schedule grid now shows times in the user's local timezone for users outside Argentina; 24/7 channels remain timezone-agnostic and always show the live badge + correct stream URL
### Changed
- `mergeTodayIntoWeek` now uses Buenos Aires time (not device local time) to correctly refresh live status for non-ART users
### Fixed
- Analytics events: added `|| 'unknown'` fallback to `channel_name` in `streamer_service_click` event (FavoritesScreen)
- BannerCarousel: replaced `pagingEnabled` with `snapToInterval` to fix previous banner bleeding on left edge during swipe
- ProgramBlock: pass `channelName` as required prop from ProgramRow so analytics events always receive the real channel name
- Android sticky nav: restored overlay for correct touch targets; overlay position driven by Animated.Value (native driver) for smooth scroll tracking with no jump or double-header
- Android sticky nav: category row scroll position preserved when overlay activates; `Animated.timing(duration:0)` correctly resets overlay position after programmatic scroll-to-top on category change
- iOS sticky nav: removed overlay (was never needed on iOS), eliminating category scroll reset and wrong-day highlight when banner scrolled away
- Schedules: deduplicate by composite key after timezone localization to prevent React key collisions from spanning virtual events
### Removed

---

## [1.0.9] - 2026-06-03

### Added
- Zona de overflow en el schedule grid: muestra programas de 00:00–03:59 del día siguiente al final de la grilla
- Indicador visual de programa especial (weekly override): dot naranja o pill con texto "¡Hoy!" / "¡Especial!" / "Cancelado"

### Fixed
- Bordes de program blocks en zona de overflow ahora reflejan correctamente el estado (en vivo, pasado, futuro)
- Badge LIVE en zona de overflow: se muestra cuando el reloj está entre 00:00–03:59 y el programa está en vivo
- Cálculo de `isPast` para programas de overflow corregido (comparación en escala extendida de 28h)
- Corte de palabras en bloques angostos: los títulos ya no se parten en medio de una palabra

---

## [1.0.7] - 2026-04-14

### Added
- Datadog Mobile Session Replay enabled with 20% sample rate

### Fixed
- Analytics events: `channel_name` now passes the real channel name in all program events (`program_subscribe`, `program_unsubscribe`, `click_youtube_live`, `click_youtube_deferred`) — previously always `'unknown'` because `program.channel` was not included in the API response
- Analytics events: added `|| 'unknown'` fallback to `channel_name` in `streamer_service_click` event (FavoritesScreen)
- BannerCarousel: replaced `pagingEnabled` with `snapToInterval` to eliminate adjacent banner bleeding on left edge during swipe; fixed `BANNER_WIDTH` calculation to account for 1px border on each side

---

## [1.0.6] - 2026-04-12

### Added
- Datadog RUM integration: dual-tracks all events (screen views, custom actions, user identification) alongside PostHog and Firebase Analytics, enriching every action with user context (id, gender, age, age_group, role) matching the web frontend

### Fixed
- Style override indicator (team colors) now renders as a compact dot in overlapping/stacked program blocks instead of a full band that clutters the compressed view
- Schedule lane assignment uses greedy interval graph coloring (matching the web), fixing lane over-count when non-overlapping programs shared a common overlap partner

---

## [1.0.5] - 2026-04-07

### Fixed
- Overlapping programs in the same channel row now stack vertically instead of
  rendering on top of each other — matches the web layout (equal-height sub-rows,
  sorted by start time)
- Pull-to-refresh broken on iOS after 1.0.3 — bounces were disabled which suppressed
  the pull gesture; now enables bouncing on iOS when a refresh handler is present
- Programs longer than 6 hours are now split into equal-width segments so the title
  is always visible within the viewport — matches web mobile behavior (6h threshold)
- Past/future/live styling for program blocks and time header when viewing non-today days
- Android text clipping in overlapping (stacked) program blocks
- Duplicate schedule IDs when navigating to non-today days — mergeTodayIntoWeek
  was including multi-day schedules from the today/v2 endpoint causing React key conflicts

---

## [1.0.4] - 2026-04-06

### Fixed
- Overlapping programs in the same channel row now stack vertically instead of
  rendering on top of each other — matches the web layout (equal-height sub-rows,
  sorted by start time)
- Pull-to-refresh broken on iOS — `bounces={false}` was silently suppressing the
  pull gesture; now enables bouncing on iOS when a refresh handler is present
- Programs longer than 6 hours are now split into equal-width segments that each
  show the program title, matching the web layout and ensuring titles are always
  visible within the viewport
- Fixed multi stream program block UI
- Fixed past, present and future styles


---

## [1.0.3] - 2026-04-03

### Added
- Post-auth subscribe: when a logged-out user taps the bell or subscribe button,
  the action is queued and executed automatically after successful login/register
- Pull-to-refresh spinner now uses brand colors (blue spinner on dark background)
  instead of the default system style

### Changed
- Profile screen: gender field is now editable via dropdown menu
- Profile screen: birth date is now editable via native DateTimePicker (same UX
  as registration flow)
- Profile screen: removed redundant title/back button (header handled by navigation)
- Profile screen: password fields no longer auto-capitalize
- Profile screen: success feedback now uses an in-app Snackbar instead of a
  system Alert
- After account deletion, user is redirected to the home screen instead of staying
  on the (now meaningless) Profile screen
- Holiday dialog now shown only once per day — not on every app reload

### Fixed
- Day selector buttons (L/M/X/J/V/S/D) now work correctly regardless of vertical
  scroll position — fixed via nav overlay approach that avoids the React Native
  stickyHeaderIndices touch-offset bug on Android
- EN VIVO FAB now correctly positioned on Android with 3-button navigation bar
  (dynamic bottom inset via useSafeAreaInsets)
- EN VIVO button now resets to today's day when viewing a different day, matching
  web behavior
- YouTube live stream video no longer freezes and disappears after ~3 minutes —
  removed androidLayerType: 'hardware' which caused Android compositor layer
  recycling; added auto-remount recovery for both Android (onRenderProcessGone)
  and iOS (onContentProcessDidTerminate)
- Splash screen background no longer shows a white box behind the logo on iOS —
  dark background baked directly into the splash asset
- Birth date timezone bug: date no longer shows one day off due to UTC midnight
  parsing — normalized to local noon on both load and picker selection
- Push notification permission dialog on Android was silently skipped for users
  who had the permission flag set before the fix — switched to expo-notifications
  API which is more reliable on Android 13+; flag now set after the dialog returns
- On logout, FCM token is unregistered from the backend so push notifications
  are no longer delivered to signed-out users
- Bell (notification) button in program tooltip now always appears on the right
  side, regardless of whether a playlist/stream button is present
