# Menú semanal con IA: flujo y experiencia de usuario

Estado: **borrador v1**, definido en entrevista el 2026-11-04. Este documento manda sobre la implementación de la PR sin commit; las diferencias están en [Diferencias con la PR actual](#diferencias-con-la-pr-actual).

## 1. Propósito

La IA existe para **ahorrar el trabajo de planificar**: la persona obtiene una semana completa casi lista y solo toca lo que no le guste. No es una herramienta de descubrimiento ni de variedad culinaria.

Principios:

- **Control antes que automatismo.** Nada se guarda sin que la persona lo acepte.
- **Solo recetas propias.** La IA elige entre recetas ya guardadas; nunca inventa.
- **Los datos guardados son sagrados.** Un fallo de la IA jamás altera el menú existente.
- **Sin jerga de IA.** Textos cercanos y breves.

## 2. Alcance de la v1

Dentro:

- Generar el menú de la **semana siguiente** (lunes a domingo próximos) con un botón explícito.
- Confirmar el horario de 7 días antes de generar.
- Vista previa editable y aceptación explícita.
- Cambiar una comida de la vista previa sin llamar a la IA.
- Generar otra propuesta completa desde la vista previa (cuenta como intento).
- Tour de primera vez.
- Bloqueo de semanas actual y pasadas con gesto de mantener pulsado.

Fuera (explícitamente):

- Recetas nuevas creadas por la IA.
- Preferencias, restricciones dietéticas o indicaciones en texto libre.
- Explicar por qué se eligió cada receta.
- Generar semanas distintas a la siguiente.
- Candado por comida individual.
- Uso por invitados (siguen con el planner local, sin IA).
- Sugerencias proactivas o automáticas de generación.

## 3. Actores y acceso

- **Cuenta con sesión:** acceso a la IA.
- **Invitado:** planner local como hasta ahora. No se muestra la función de IA.

## 4. Qué sabe la IA

Entradas: recetas propias (nombre, ingredientes, tipo comida/cena), asignaciones de la **semana actual (los 7 días)** y de la **semana anterior**, y el horario confirmado de la semana objetivo normalizado a franjas en casa (comida/cena por día), con el número de recetas guardadas de cada tipo. Para regenerar se incluyen solo los IDs por día y franja de la propuesta anterior. Nada más. No se envía identidad de la cuenta.

## 5. Flujo principal

```
Planner (cualquier vista)
   │  pulsa "Generar con IA"
   ▼
[Comprobación de recetas] ── faltan recetas ──► Aviso + enlace a añadir recetas (no se gasta intento)
   │ ok
   ▼
Diálogo de horario (7 días, obligatorio)
   │  Confirmar
   ▼
Vista previa en esqueleto (generando, hasta ~20 s)
   ├─ error ──► Mensaje claro + Reintentar (datos intactos)
   ▼
Vista previa editable
   ├─ Aceptar ──► Se guarda y el planner muestra la semana siguiente
   └─ Descartar / salir ──► Aviso; si confirma, se pierde la propuesta
```

### 5.1 Punto de entrada

- El botón **Generar con IA** está disponible **en cualquier vista del planner** y siempre actúa sobre la semana siguiente, aunque la persona esté mirando otra semana.
- Solo existe para cuentas con sesión.

### 5.2 Comprobación previa de recetas

El horario se confirma dentro del diálogo, así que la comprobación tiene **dos pasos**. Ninguno consume intento ni llama a la generación.

1. **Antes de abrir el diálogo:** solo se bloquea si la persona no tiene **ninguna receta guardada** (ni de comida ni de cena). En ese caso no se abre el diálogo: se muestra un aviso modal que explica que hacen falta recetas, con la acción principal «Añadir recetas» (abre Preferencias en la sección de recetas) y «Cerrar». Al cerrar, el foco vuelve al botón que lo abrió. Si no se puede leer el catálogo, no se bloquea y se abre el diálogo.
2. **Al confirmar el horario:** se calculan los tipos de comida que el horario confirmado deja **en casa** (con las mismas reglas de franjas cubiertas que la generación). Si falta un tipo necesario (comida o cena), el diálogo **sigue abierto** y muestra un aviso inline (`role="alert"`) que nombra el tipo que falta, con la misma acción «Añadir recetas». La persona puede editar el horario (por ejemplo, marcar esas franjas como comer fuera) y volver a confirmar. Un tipo sin recetas que el horario ya cubre por completo no bloquea.

Los avisos de escasez de la vista previa (`unavailableSlots`) siguen igual.

### 5.3 Diálogo de horario (siempre obligatorio)

- Se muestran siempre los **7 días de la semana siguiente**, editables, aunque todos estén en casa.
- Cada día indica dónde se come: en casa, oficina o comer fuera.
  - **Oficina:** cubre la comida; la cena se planifica en casa.
  - **Comer fuera:** la persona elige si cubre comida, cena o ambas.
- Valores iniciales: si la semana siguiente ya tiene horario guardado, se precarga; si no, **todo en casa** (no se copia el horario de la semana actual).
- Hay una acción explícita de confirmar. Antes de confirmar no hay llamada a la IA ni guardado.
- Si ya existe un menú guardado para la semana siguiente, el diálogo muestra, encima de los botones, una nota visible (no es una alerta): «La próxima semana ya tiene un menú. Si aceptas la nueva propuesta, lo reemplazará por completo.» Si la semana está vacía no se muestra nada.

### 5.4 Generación

- Al confirmar, el diálogo **se cierra** y el planificador muestra la **semana objetivo** con la **vista previa en esqueleto**: 7 tarjetas de día con huecos de carga y una etiqueta visible («Armando el menú de la próxima semana…») en lugar del banner. Es una única región de estado anunciada con cortesía (`role="status"`, `aria-live="polite"`, `aria-busy="true"`). Mientras dura no hay acciones de aceptar, descartar ni editar horario.
- Al llegar el resultado, el esqueleto se sustituye por la vista previa editable. Si falla, se muestra el error con «Reintentar» y no queda nada anterior.
- Si se regenera tras editar el horario desde una vista previa, la vista previa anterior queda oculta y también se muestra el esqueleto. El movimiento del brillo respeta `prefers-reduced-motion`.
- Duración máxima aproximada de 20 s.

### 5.5 Vista previa editable

- Muestra los 7 días con sus comidas y cenas.
- Las comidas **cubiertas fuera de casa** se ven **bloqueadas y etiquetadas** (p. ej. "Oficina", "Fuera"); no admiten receta y nunca cuentan como táper.
- En cada hueco planificado en casa, la persona puede **cambiar la receta** por otra de sus recetas del tipo correspondiente (comida o cena). Este cambio es **local, sin IA y sin consumir cuota**.
- Las alternativas se ofrecen en **orden alfabético** según el idioma de la interfaz (sin distinguir mayúsculas ni acentos, números en orden numérico). «Sin receta» va siempre primero y la receta elegida se mantiene seleccionada.
- Si la semana ya tenía un menú guardado, el banner de la vista previa añade una línea junto a «Aceptar»: «Al aceptar, se reemplaza el menú que ya tienes guardado esta semana.»
- **Generar otra:** botón secundario del banner, junto a «Editar agenda». Pide una propuesta completa nueva para el **mismo horario ya confirmado** y de la **misma semana de la vista previa** (aunque ya haya llegado el lunes).
  - Cuenta como **un intento** de los 5 por hora: es la misma llamada al servidor y no hay ningún aviso de cuota hasta que se alcanza el límite.
  - Solo pide confirmación si la persona hizo **cambios manuales** («¿Generar otra? Perderás los cambios que hiciste a mano en esta propuesta.»). Sin cambios (o si los revirtió), genera directamente.
  - El servidor recibe solo los **IDs de receta** de la propuesta actual por día y hueco, para variar; nunca nombres, ingredientes ni identidad. Si la propuesta es de otra semana, lo ignora.
  - Reutiliza el horario completo de la propuesta visible; no repite la comprobación de un catálogo que ya está cargado.
  - Durante la espera se muestra el esqueleto. Si falla (error, límite, otra generación en curso o semana obsoleta), **se conserva la propuesta anterior con sus cambios manuales** y el mensaje de error; no se guarda nada y «Aceptar» sigue funcionando. Tras un error de generación u otra generación en curso, «Reintentar» y «Generar otra» reutilizan esa propuesta sin abrir de nuevo el diálogo de horario. Con límite o semana obsoleta, «Generar otra» sigue desactivado.
  - Está desactivado mientras se guarda, se genera o el catálogo de recetas no está cargado. Al llegar la vista previa, el foco pasa a su encabezado si el botón que inició la generación ya no existe.
- No hay explicaciones de por qué se eligió cada receta.
- Las recetas pueden repetirse en huecos distintos.
- Si no hay recetas de un tipo, esos huecos quedan vacíos con la explicación de qué falta.
- Editar el horario desde la vista previa **invalida** la propuesta: hay que confirmar y generar de nuevo. Cancelar ese cambio restaura la propuesta original, incluidos los cambios manuales.
- Mientras se guarda, los selectores quedan deshabilitados.
- **Aceptar** permanece deshabilitado hasta que la semana objetivo y el catálogo de recetas estén cargados.

### 5.6 Aceptar

- Guarda exactamente lo que se ve en la vista previa y **reemplaza toda la semana siguiente**. Si esa semana ya tenía menú, el diálogo de horario y el banner lo avisan antes de aceptar (secciones 5.3 y 5.5).
- Tras guardar, el planner **navega a la semana siguiente** con el menú aplicado.
- Si el guardado falla, la vista previa se conserva intacta y se puede reintentar.

### 5.7 Descartar

- Cerrar, cambiar de ruta, recargar o cancelar con cambios pendientes muestra un **aviso de confirmación**.
- Si la persona confirma, la propuesta **se pierde** (no se guarda como borrador).

## 6. Errores y límites

| Situación                                                              | Comportamiento                                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Fallo, timeout o respuesta inválida                                    | Mensaje claro y botón **Reintentar**. Datos guardados intactos. No hay relleno aleatorio.                     |
| Respuesta con recetas inválidas en huecos elegibles                    | Se reparan en silencio con candidatas del mismo hueco.                                                        |
| Respuesta de otra semana, huecos cubiertos asignados o días duplicados | Se rechaza; se trata como fallo.                                                                              |
| Límite de 5 generaciones por hora                                      | Se comunica **solo al alcanzarlo**, indicando cuándo se podrá volver a generar. Las fallidas también cuentan. |
| Dos generaciones simultáneas de la misma cuenta                        | Solo se procesa una; la otra se rechaza con mensaje.                                                          |
| Cambio de semana (domingo → lunes) durante el flujo                    | Ver sección 8.                                                                                                |

Los reintentos del servidor son cero; el único reintento es el que pulsa la persona.

## 7. Bloqueo de semanas

### 7.1 Modelo

- **Semanas futuras (incluida la siguiente):** siempre editables y generables.
- **Semana actual y semanas pasadas:** **bloqueadas**. Esto aplica a cualquier menú, generado por IA o hecho a mano. La semana siguiente se bloquea sola cuando pasa a ser la actual.
- El estado depende de la fecha, no de haber aceptado una propuesta.

### 7.2 Botón de bloqueo

- Aparece **centrado sobre el menú** de la semana que se está viendo, solo en semanas actual y pasadas.
- Estado cerrado por defecto. Para desbloquear hay que **mantener pulsado 1000 ms (1 s)**, con un **anillo de progreso** que se llena; soltar antes cancela.
- **Accesibilidad:** mantener **Enter o Espacio** produce el mismo anillo y el mismo resultado, con anuncio para lectores de pantalla.
- Solo aparece si hay un menú visible; no aparece en semanas vacías ni sobre una vista previa o su esqueleto.
- Mientras una semana está bloqueada, Preferencias → Horario es de solo lectura, muestra una nota y no permite guardar. Cambiar el horario es la acción fuera del flujo de IA que modifica las asignaciones de comidas del menú guardado; las comidas guardadas no tienen otro editor directo.
- Preferencias → Recetas sigue disponible: gestiona el catálogo de la cuenta, no el horario de la semana vista. Generar con IA sigue disponible desde una semana bloqueada porque apunta a la siguiente, y aceptar una vista previa fijada a una semana que ya es actual sigue permitido.
- Los invitados también tienen el mismo bloqueo por fecha para los menús locales que pueden ver.
- Con movimiento reducido se mantiene el gesto de 1000 ms y un indicador de pulsación estático, sin animar el anillo.

### 7.3 Re-bloqueo

El desbloqueo es temporal y solo del cliente: la semana vuelve a bloquearse **al salir de ella o al recargar**. No se persiste en almacenamiento, servidor ni base de datos.

## 8. Cambio de semana durante la vista previa

Si la vista previa se abre un domingo y llega el lunes, **la propuesta sigue ligada a su semana original**. Se puede aceptar y editar con normalidad; al guardarse, esa semana ya es la actual y, por tanto, queda bloqueada (sección 7).

Si la respuesta de la IA llega ya pasado el lunes para una semana objetivo antigua, el servidor la rechaza como obsoleta, no se muestra vista previa y se ofrece reconfirmar el horario para la nueva semana siguiente. En un reintento tras fallo ordinario, si la semana objetivo cambió, se cargan el horario y los valores iniciales de la nueva semana, no los del borrador anterior.

Los límites de semana se calculan con la zona horaria IANA del navegador validada en servidor; el lunes civil no se calcula con intervalos de 24 h.

## 8bis. Primera vez

La primera vez que una cuenta usa **Generar con IA** se muestra un **tour de 2 o 3 pasos**: (1) confirmar el horario, (2) revisar y cambiar la propuesta, (3) aceptar; nada se guarda hasta ese momento. Se puede saltar y no vuelve a aparecer una vez completado o saltado.

## 9. Idioma y tono

- **Bilingüe:** español e inglés, según el idioma de la interfaz.
- Español: cercano, tuteo, frases cortas, sin jerga técnica de IA.

## 10. Privacidad y costes

- El prompt no se persiste.
- El texto de las recetas se trata como datos, no como instrucciones.
- Solo se envía lo listado en la sección 4.

## 11. Puntos abiertos

Resueltos: "Generar otra" (cuenta como un intento; confirmación solo con cambios manuales), orden alfabético de alternativas, aviso de reemplazo, sin mínimo cuantitativo de recetas, y tour de primera vez.

1. **Resuelto para v1 — desbloqueo temporal solo cliente:** el bloqueo es una protección de la experiencia de usuario, no un permiso de servidor. Las llamadas directas a la API no están bloqueadas; no hay estado persistido ni cambio de esquema.
2. **Textos finales** en ambos idiomas, y diseño visual del anillo, del candado y del tour.

## Diferencias con la PR actual

| Tema                                                                                                                           | Este documento                                    | PR sin commit                                        |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------- |
| Bloqueo de semanas actual y pasadas con mantener pulsado                                                                       | Incluido                                          | No existe                                            |
| Cambio de hueco en vista previa sin IA                                                                                         | Local, sin cuota                                  | Selector local (ya compatible)                       |
| Aviso de faltantes antes de generar                                                                                            | Previo, con enlace a recetas y sin gastar intento | Se genera y los huecos quedan vacíos con explicación |
| Límite de uso                                                                                                                  | Solo al alcanzarlo                                | A confirmar en la UI                                 |
| Idioma                                                                                                                         | Español e inglés                                  | A revisar                                            |
| Cambio de semana en vista previa                                                                                               | La propuesta sigue ligada a su semana             | Coincide en lo esencial                              |
| Horario siempre confirmado, vista previa editable, descarte con aviso, reemplazo total, solo recetas propias, invitados sin IA | Igual                                             | Ya implementado                                      |

Notas para la implementación: según `AGENTS.md`, lo nuevo (bloqueo y comprobación previa) se verifica con E2E y deja artefacto repetible, y no se escriben tests unitarios después del código.
