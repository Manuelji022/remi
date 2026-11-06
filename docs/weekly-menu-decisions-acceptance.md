# Checklist de aceptación previa: menú semanal con Decisions

Estado: **checklist de verificación y evaluación pendiente**. Actualizado: 2026-11-06.

Checklist derivada de las secciones 4, 6, 7, 9 y 10 de [plan de implementación](weekly-menu-decisions-implementation.md). El propietario ordenó el 2026-11-06 retirar el motor anterior antes de la evaluación en vivo; los puntos sin marcar no se declaran verificados. Las reglas de interacción siguen en [menú semanal con IA](ai-weekly-menu-ux.md).

Separar dos tipos de verificación:

- **E2E determinista:** se ejecuta en CI o localmente con fixtures. Prueba reglas, flujo, errores y permisos. No mide calidad culinaria.
- **Calidad culinaria en vivo:** requiere credencial real, modelo elegido y recetas revisadas por la persona. Es una evaluación separada y no es requisito de la red de tests.

## A. E2E determinista (fixtures)

### A1. Reglas de producto (sección 4)

- [ ] La generación apunta a la semana siguiente (lunes a domingo, zona horaria del usuario), aunque la pantalla muestre otra.
- [ ] El historial usa `targetWeekStart - 1` y `- 2` semanas con funciones de calendario existentes.
- [ ] Current, parcial, ausente y solo horario: la generación funciona en los cuatro casos y solo usa historial disponible.
- [ ] Una lectura fallida o un registro corrupto produce error, no «semana ausente», y no gasta intento de proveedor.
- [ ] Ninguna receta queda excluida de forma permanente por aparecer en el historial.
- [ ] No se crea menú ficticio ni se copia la propuesta objetivo para suplir historial.
- [ ] Una receta fuera de la página visible del catálogo puede entrar en las propuestas.
- [ ] Una receta de comida nunca ocupa una cena, ni al revés.
- [ ] Oficina cubre la comida y comer fuera cubre las franjas elegidas; las celdas cubiertas quedan sin receta.
- [ ] Con pocas recetas se permite repetir. Sin huecos domésticos, devuelve semana sin asignaciones y no invoca Decisions.
- [ ] Catálogo vacío o tipo de franja ausente se comunica antes de generar.
- [ ] Un borrado concurrente que deja huecos sin candidatos devuelve `unavailableSlots` sin inventar IDs ni tomar recetas de otra franja.
- [ ] Un cambio de semana durante la petición produce `stale-week`, también en el resultado local de reserva.

### A2. Errores y alternativa local (sección 6)

| Caso                                                                        | Resultado esperado                                                                                               |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Primera generación: timeout, indisponibilidad, rechazo o respuesta inválida | Con candidato local validado: vista previa con aviso, sin guardado automático. Sin candidato: error recuperable. |
| Regeneración con propuesta previa: fallo de Decisions                       | Se conserva la propuesta anterior con sus cambios manuales. No se sustituye por alternativa local.               |
| Elección desconocida o respuesta malformada                                 | No se repara inventando otra asignación. Resolver solo opciones del mapa del servidor.                           |
| Credencial ausente o modelo mal configurado                                 | Error de configuración sin secretos, recuperable, nunca presentado como éxito de IA.                             |
| Fallo al guardar                                                            | Vista previa editable intacta y reintento posible.                                                               |
| Semana obsoleta, sesión inválida, error de base de datos o guard rechazado  | Tratamiento actual; sin propuesta de reserva que lo eluda.                                                       |
| Intento que llega al tramo protegido                                        | Consume cuota según la política actual, aunque acabe en alternativa o error. El lease se libera siempre.         |

- [ ] La alternativa local no afirma haber evaluado pesadez si no tiene esa información.
- [ ] El campo `selectionSource` (`decision` o `local`) muestra el aviso localizado de alternativa básica.
- [ ] La causa técnica se registra solo en el servidor.

### A3. Edición manual, aceptación y guardado (sección 7)

- [ ] Cada hueco en casa muestra solo recetas de su franja, con «Sin receta» y orden alfabético.
- [ ] Cambiar una receta modifica solo el borrador visible: cero llamadas a Decisions y cero consumo de cuota.
- [ ] Se permiten repeticiones y parejas pesadas elegidas a mano; el motor no las sobrescribe.
- [ ] «Aceptar» guarda exactamente lo visible, incluidos cambios manuales, y el servidor no reoptimiza.
- [ ] Tras aceptar, la edición habitual y las protecciones de semanas actuales y pasadas siguen funcionando.
- [ ] La lista de compra y la checklist derivadas reflejan la receta final, no la original.
- [ ] «Generar otra» pide confirmación si hay cambios manuales. Si falla, el borrador anterior queda intacto; si funciona, solo cambia la vista previa.
- [ ] Editar horario invalida la propuesta y exige nueva confirmación. Cancelar restaura receta y horario anteriores.
- [ ] Descartar no escribe en base de datos.
- [ ] Una respuesta tardía, un cambio de usuario o un cierre de sesión no aplica un borrador de otra generación o cuenta.

### A4. Concurrencia, cuota y permisos (sección 5.3 y sección 9)

- [ ] Dos peticiones simultáneas: solo una entra en el tramo protegido.
- [ ] Cinco intentos por hora por acción; las precondiciones fallidas y el horario totalmente cubierto no gastan intento.
- [ ] Una propuesta única pasa una vez por el guard sin llamada remota.
- [ ] Presupuesto remoto de 20 segundos y `maxRetries: 0`, sin encadenar llamadas ni cambiar de modelo.
- [ ] La validación final comprueba semana, siete días, franjas cubiertas, compatibilidad y disponibilidad de recetas.
- [ ] Si la lista finalista no cabe en el tamaño de estado, se reduce el número de propuestas sin recortar ingredientes en silencio.
- [ ] Ningún resultado se aplica a una cuenta o semana distinta de la que lo originó.

### A5. Harness y evidencia

- [ ] Los escenarios se escribieron antes del código y los mocks de Decisions ejercitan el adaptador de selección.
- [ ] Se amplía `frontend/e2e/real-stack/ai-weekly-menu.scenario.js` y el harness de [AI-WEEKLY-MENU.md](../frontend/e2e/AI-WEEKLY-MENU.md).
- [ ] Se genera `frontend/e2e/artifacts/weekly-menu-decisions-results.json` con escenario, semilla, versión del algoritmo y rúbrica, candidatos, opción elegida, origen y aserciones.
- [ ] Hay capturas de vista previa, cambio manual, recuperación de fallo y menú aceptado.
- [ ] Los comandos y resultados reales se anotan en la PR; no se marcan como cumplidos los que no se hayan ejecutado.

## B. Calidad culinaria en vivo (no bloqueante para E2E)

Requiere credencial de Gateway proporcionada por la persona, acceso al modelo elegido y revisión previa de recetas de prueba.

- [ ] La rúbrica «pesado / ligero / desconocido» se revisa con ejemplos reales en la evaluación posterior a la activación. Una receta ambigua o con ingredientes incompletos no se marca como ligera.
- [ ] Ningún ingrediente aislado (arroz, pasta, legumbres, queso) define por sí solo la pesadez.
- [ ] Con evidencia de platos pesados y ligeros, el modelo prefiere repartir los pesados entre días. Si solo hay pesados, no deja huecos ni cambia franjas.
- [ ] Con recetas revisadas, la selección no es peor que la local en repeticiones evitables ni en parejas pesadas evitables.
- [ ] El informe separa resultados del modelo, preferencias humanas y garantías verificadas por código.
- [ ] Se documentan los errores de juicio culinario encontrados. Ninguna salida afirma equilibrio nutricional.
- [ ] Se registran modelo, versiones de rúbrica y algoritmo, número de candidatos, disponibilidad de historial, origen, duración y resultado técnico. No se guardan claves ni ingredientes completos por defecto, y los tokens desconocidos no se registran como cero.

## C. Evaluación posterior a la activación (sección 10)

Pendiente tras la retirada anticipada ordenada por el propietario (sin llamadas en vivo en esta PR):

- [ ] Las reglas obligatorias y los flujos de edición y aceptación pasan el E2E determinista sin regresiones.
- [ ] Cada generación remota usa una sola selección; editar a mano cuesta cero llamadas.
- [ ] El conjunto revisado incluye historial ausente y parejas pesadas evitables, sin violaciones conocidas de reglas obligatorias.
- [ ] Hay comparación contra la versión anterior archivada y contra la selección local, con las mismas entradas.
- [ ] En piloto se miden aceptación sin cambios, número de cambios y regeneraciones. Son señales de utilidad, no medidas nutricionales.
- [ ] Antes de la evaluación en vivo se acuerdan los límites de fallos, latencia y coste, a partir de una línea base medida.
- [ ] Se verifica redesplegar la versión anterior para rollback y se declara lo que no se haya probado.
- [ ] Runtime en VPS propio: Node con Nitro, `AI_GATEWAY_API_KEY` inyectada en el proceso o contenedor, sin dependencia de OIDC ni de servicios de Vercel.
- [ ] La salida a Gateway es HTTPS desde el servidor, y el proxy inverso tiene un tiempo de espera superior al presupuesto de generación.
- [ ] La credencial no aparece en navegador, respuestas, errores, logs ni estado de Decisions.
- [ ] Decisions es el único motor; el VPS requiere `AI_GATEWAY_API_KEY` para generación remota (sin clave: error recuperable, edición/guardado manual disponibles); no hay selector de rollback.
- [ ] La serie de PR apunta a `main`, es secuencial y cada PR está verde, verificada, revisada y fusionada antes de crear la siguiente rama.
- [ ] Pendiente de la persona: credencial de Gateway, acceso al modelo y revisión de ejemplos de recetas.
