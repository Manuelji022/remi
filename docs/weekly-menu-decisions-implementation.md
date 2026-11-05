# Plan de implementación: menú semanal con decision models

Estado: **propuesta de implementación; funcionalidad pendiente**. Fecha: 2026-11-05.

Este documento define la sustitución de la selección generativa actual por un planificador de propuestas y un decision model mediante **Vercel AI SDK + AI Gateway**. No requiere credenciales para su redacción. La variable de autenticación la proporcionará el usuario más adelante.

## 1. Resultado esperado

La persona confirma el horario de la **semana siguiente**, recibe una propuesta basada en todas sus recetas compatibles y puede cambiar manualmente cualquier comida o cena planificada en casa. El menú de la semana actual ayuda a evitar repeticiones cuando existe. Su ausencia no bloquea la generación.

La propuesta debe favorecer variedad y evitar concentrar dos platos muy pesados en el mismo día cuando el catálogo permita alternativas. La persona conserva la última palabra: los criterios de generación no impiden sus cambios manuales.

La implementación conserva el flujo de [menú semanal con IA](ai-weekly-menu-ux.md): horario confirmado, vista previa, edición, aceptación explícita, descarte y regeneración. Este plan amplía el criterio culinario de selección y cambia su mecanismo técnico; no sustituye las reglas de interacción de ese documento. Al implementar, actualizar ambos documentos en los puntos que cambien, especialmente entradas al modelo y recuperación de errores.

## 2. Punto de partida verificado

| Pieza actual                                                                                | Función                                                         | Uso en la implementación                                                         |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `frontend/src/features/weekly-menu/ai-generator.ts`                                         | `generateText`, Gateway y validación de asignaciones            | Sustituir la selección por Decisions y separar la validación del proveedor.      |
| `frontend/src/features/weekly-menu/week.ts`                                                 | Normalización y `assignRecipesToWeek`                           | Reutilizar las reglas del calendario; extender la construcción de propuestas.    |
| `frontend/src/features/weekly-menu/ai-generation-store.ts`                                  | Carga catálogo y dos semanas de historial                       | Conservar lecturas por usuario; representar historial disponible explícitamente. |
| `frontend/src/features/weekly-menu/functions.ts`                                            | Autenticación, semana objetivo y generación protegida           | Mantener `createServerFn`, permisos y comprobaciones de fecha.                   |
| `frontend/src/features/weekly-menu/ai-generation-guard.ts`                                  | Cinco intentos por hora y exclusión de generaciones simultáneas | Conservar una adquisición por acción, con trabajo acotado.                       |
| `frontend/src/features/weekly-menu/hooks/useAiMenuGeneration.ts` y `ai-generation-state.ts` | Vista previa, cambios, regeneración y recuperación              | Conservar el control de estado y protección frente a respuestas antiguas.        |
| `frontend/src/features/weekly-menu/store.ts`                                                | Lectura y guardado de la semana                                 | Mantener el guardado explícito y validación de recetas.                          |

`frontend/package.json` fija `ai` en **7.0.154**. Las declaraciones instaladas exponen `experimental_decide` y reexportan `createGateway`. No se presupone una actualización del SDK ni la instalación de otro proveedor para empezar.

El tipo `Recipe` actual contiene ID, nombre, tipo comida/cena e ingredientes. No tiene etiquetas de pesadez, técnica de cocina, tiempo ni información nutricional estructurada.

## 3. Integración elegida y configuración

Se usará `experimental_decide` de `ai` con una instancia de Gateway que exponga `decisionModel()`. La documentación de Vercel sitúa esta API a partir de `ai` 7.0.128 y la mantiene experimental: conservar versiones fijadas y verificar compatibilidad al actualizar. [Referencia de integración](https://vercel.com/i/ai-sdk-evaluation-to-decisions).

Configuración propuesta, exclusivamente de servidor:

| Variable                        | Tratamiento                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `AI_GATEWAY_API_KEY`            | Credencial existente de Gateway; pendiente de que el usuario la configure. Nunca usar prefijo `VITE_`.                               |
| `AI_WEEKLY_MENU_DECISION_MODEL` | Nueva variable para el ID del decision model. Propuesta inicial: `openai/gpt-6-luna-decisions`, sujeta a comprobar acceso y calidad. |
| `AI_WEEKLY_MENU_MODEL`          | Conservar durante la comparación con el generador actual; no reutilizarla silenciosamente como ID de Decisions.                      |
| `AI_WEEKLY_MENU_ENGINE`         | Selector de servidor: solo `decisions` (sin distinguir mayúsculas ni espacios) activa el piloto; cualquier otro valor, vacío o no reconocido, vuelve a `legacy` (predeterminado, con un único aviso en servidor). Con `AI_WEEKLY_MENU_MOCK=true` fuera de producción siempre se usa el mock.                                           |

Vercel documenta `openai/gpt-6-luna-decisions` como modelo de Decisions en Gateway, distinto del modelo de propósito general. Gateway admite autenticación con su clave o Vercel OIDC; este diseño usa solo `AI_GATEWAY_API_KEY` y no depende de OIDC ni de servicios de Vercel. No se necesita una clave directa de OpenAI. [Modelo y autenticación](https://vercel.com/i/ai-sdk-evaluation-to-decisions#choose-direct-openai-or-ai-gateway-access).

Antes de integrar, comprobar que `createGateway(...).decisionModel(id)` existe en la versión resuelta y que el modelo soporta `choice`. Si la versión instalada obliga a importar `@ai-sdk/gateway` directamente, declararlo como dependencia directa compatible y actualizar el lockfile; no depender de una importación transitiva.

Una clave ausente o un modelo mal configurado no deben producir una supuesta generación con IA correcta. Sin credenciales se desarrolla con fixtures; la verificación real quedará pendiente y declarada.

### Runtime en VPS propio

La aplicación se despliega en un VPS del propietario, no en el hosting de Vercel.

- El servidor corre Node con Nitro (TanStack Start) y es el único proceso que llama a Gateway. No se usan funciones serverless de Vercel ni servicios específicos de esa plataforma.
- `AI_GATEWAY_API_KEY` se inyecta como variable de entorno del proceso o del contenedor. No se guarda en archivos versionados y no se obtiene con `vercel link` ni `vercel env pull`. No hay `vercel deploy`.
- La salida hacia Gateway es HTTPS desde el servidor. El navegador nunca llama a Gateway directamente.
- El proxy inverso del VPS tiene un tiempo de espera superior al tiempo máximo de la generación acotada por la aplicación (presupuesto remoto de 20 segundos más trabajo local), para que el error controlado llegue antes de que el proxy corte la respuesta.
- La credencial no se envía al navegador, no aparece en respuestas, errores, logs ni estado de Decisions.
- Este plan no cambia infraestructura, variables reales ni acceso a producción. La operación se documentará en la entrega 2.

## 4. Reglas de producto

### 4.1 Semana objetivo e historial opcional

- El botón genera el próximo lunes a domingo según la zona horaria del usuario, independientemente de la semana visible en pantalla.
- Calcular la semana actual como `targetWeekStart - 1 semana`; la anterior como `targetWeekStart - 2 semanas`. Reutilizar las funciones de calendario existentes, sin restar milisegundos ni depender de la zona horaria del servidor.
- Considerar los siete días guardados de la semana actual, también si solo hay asignaciones parciales. Los cambios manuales ya guardados forman parte de ese historial.
- La semana actual tiene mayor importancia que la anterior. Nunca excluir permanentemente una receta por haber aparecido en el historial.
- Si no hay menú actual, usar historial actual vacío. Si existe solo horario, tampoco hay recetas que penalizar. La semana anterior puede seguir aportando contexto si existe.
- No crear un menú ficticio ni copiar la propuesta objetivo para suplir historial ausente. La propuesta anterior enviada para regenerar es un dato diferente.
- `loadMenuWeekForUser` ya distingue ausencia con `hasSavedMenu: false` y devuelve una semana vacía. Un error de consulta o un registro corrupto **no equivalen a ausencia**: se conserva el error, sin gastar intento de proveedor.
- Verificar semana objetivo antes y después de generar. Si cambia la semana durante la petición, mantener el comportamiento `stale-week`; un resultado local de reserva tampoco puede eludir esa comprobación.

### 4.2 Catálogo completo y franjas

En este plan «mañana/tarde» se interpreta como las franjas actuales **comida (`lunch`) y cena (`dinner`)**. No se añaden desayuno ni merienda.

- Leer del servidor todas las recetas de la cuenta; no usar solo la página visible, una selección reciente o un subconjunto aleatorio fijo.
- Dividir candidatos por el `slot` guardado. Una receta de comida no se usa para cena, ni al revés, aunque el modelo sugiera hacerlo.
- Cada receta compatible debe poder participar en la búsqueda. Eso no significa que deban aparecer todas en una semana.
- Aplicar el horario mediante las funciones existentes: oficina cubre la comida y comer fuera cubre las franjas seleccionadas. Las cubiertas quedan sin receta.
- Mantener la comprobación previa de catálogo vacío y de tipos necesarios ausentes. Si una eliminación concurrente deja huecos sin candidatos, devolver `unavailableSlots` sin inventar recetas ni tomar las de otra franja.
- Con pocas recetas se permite repetir. Si no hay huecos en casa, devolver una semana sin asignaciones conforme al horario, sin invocar Decisions.
- Nunca truncar el catálogo silenciosamente por límites del proveedor. La búsqueda usa el catálogo completo; al modelo se envía únicamente el detalle de las recetas presentes en las propuestas finalistas.

### 4.3 Variedad y platos pesados

«Pesado» será una valoración **culinaria cualitativa**, no una estimación de calorías ni una garantía de equilibrio nutricional. Una receta con nombre ambiguo o ingredientes incompletos no se clasificará automáticamente como ligera.

Rúbrica inicial para revisión con ejemplos de recetas reales:

| Evidencia disponible                                                                                          | Interpretación propuesta                             |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Nombre que explicita fritura/rebozado, salsas cremosas abundantes o una preparación especialmente contundente | Indicio de plato pesado.                             |
| Nombre e ingredientes que describen claramente una preparación sencilla y ligera                              | Indicio de plato ligero.                             |
| Nombre genérico, cantidades insuficientes para interpretar la preparación o señales contradictorias           | Pesadez desconocida; no completar hechos que faltan. |

No convertir ingredientes aislados en reglas universales: arroz, pasta, legumbres o queso por sí solos no determinan la pesadez. No deducir técnicas ausentes en la receta.

El decision model compara las parejas comida/cena dentro de cada propuesta. Debe preferir repartir los platos contundentes entre días y combinarlos con opciones más ligeras cuando haya evidencia. Si solo hay platos pesados, no deja huecos ni cambia las franjas para simular equilibrio. Los días con una sola comida en casa no tienen una segunda receta doméstica que equilibrar; no se sabe qué se comerá fuera.

**Límite de la primera versión:** es una preferencia semántica, no una restricción demostrable con el esquema actual. La calidad depende de los datos, de las propuestas disponibles y del modelo. Si se exige una garantía de no emparejar platos pesados, hará falta una etiqueta estructurada revisada por la persona y comprobar factibilidad en código. Esa ampliación y su migración no forman parte de esta primera entrega.

### 4.4 Prioridades

1. Reglas obligatorias: propietario, semana, calendario, IDs existentes y tipo de franja.
2. Cubrir todos los huecos en casa con candidatos disponibles.
3. Evitar parejas de platos claramente pesados el mismo día, cuando existan alternativas.
4. Favorecer variedad dentro de la semana y evitar repetir recetas de la semana actual.
5. Evitar recetas de la semana anterior como preferencia secundaria.
6. Al regenerar, diferenciarse de la propuesta visible sin sacrificar las prioridades anteriores.

Las preferencias pueden entrar en conflicto. No prometer cero repeticiones ni diversidad imposible con un catálogo pequeño. Los pesos y desempates locales deben quedar versionados; los valores iniciales son hipótesis a evaluar, no verdades del producto.

## 5. Arquitectura y flujo de generación

```text
Confirmar horario
  → autenticar y comprobar semana
  → cargar catálogo completo e historial disponible
  → normalizar calendario y construir propuestas válidas
  → adquirir guard de generación una vez
  → Decisions elige una propuesta completa
  → validar selección y comprobar semana otra vez
  → mostrar vista previa editable
  → aceptar explícitamente y guardar lo visible
```

### 5.1 Preparar varias semanas con código

Crear una función de dominio, por ejemplo `buildWeeklyMenuCandidates(context, seed)`, que no acceda a la red ni a la base de datos:

1. Normalizar horario y agrupar todas las recetas por franja.
2. Calcular frecuencias de uso en las dos semanas y en la propuesta anterior, ignorando huecos vacíos.
3. Construir un conjunto acotado de propuestas con asignación por puntuación y desempate reproducible. Empezar evaluando **8 propuestas distintas**, configurable internamente.
4. Incluir exploración entre recetas recientes y menos recientes; no filtrar todas las propuestas solo a las menos usadas, porque eso puede eliminar las únicas combinaciones culinarias adecuadas.
5. Variar tanto las recetas elegidas como sus parejas por día. Dos propuestas con las mismas recetas en distinta distribución pueden tener distinto valor.
6. Aplicar una pasada acotada de intercambios dentro de la misma franja para reducir repeticiones y obtener parejas alternativas.
7. Deduplicar por las asignaciones completas de los siete días; validar cada propuesta y calcular métricas locales.

El límite de trabajo debe depender del catálogo y un número acotado de pasadas, evitando enumerar todas las combinaciones. Ordenar entradas por ID antes de aplicar la semilla. Misma entrada, semilla y versión producen las mismas propuestas; la selección remota no se promete determinista.

La semilla de regeneración cambia y tiene en cuenta la propuesta visible. Si solo existe una semana válida distinta, no inventar variación: devolver esa semana sin llamada remota. Si hay varias, excluir la propuesta idéntica al regenerar siempre que quede una alternativa válida.

Ocho propuestas no garantizan incluir el mejor menú posible. Medir cobertura del catálogo a través de varias semillas y revisar casos donde las parejas ligeras/pesadas posibles nunca llegan a la lista finalista. Si el enfoque queda corto, ajustar búsqueda o añadir clasificación estructurada antes de aumentar peticiones al modelo.

### 5.2 Elegir una semana mediante Decisions

Enviar **un estado compartido y una pregunta `choice`** que seleccione el ID de una propuesta. Evaluar semanas completas permite comparar las parejas diarias y las repeticiones; no se harán catorce elecciones aisladas.

Estado mínimo: semana objetivo, franjas domésticas normalizadas, catálogo de recetas referenciadas en las propuestas (ID, nombre, franja e ingredientes ordenados), asignaciones de historial disponible y propuestas con sus métricas verificadas. No enviar identidad, correo ni datos ajenos a la planificación.

Cada opción identifica un menú construido en el servidor. Las instrucciones incorporan las prioridades de la sección 4 y tratan nombres e ingredientes como datos no confiables, nunca instrucciones. El modelo no escribe recetas, explicaciones ni asignaciones nuevas.

Esquema orientativo, pendiente de integrar y comprobar contra el proveedor resuelto:

```ts
import { createGateway, experimental_decide as decide } from 'ai'

const gateway = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY })
const result = await decide({
  model: gateway.decisionModel(configuredDecisionModelId),
  state: preparedDecisionState,
  questions: {
    selectedMenu: {
      type: 'choice',
      instructions: selectionInstructions,
      criteria: candidateDescriptionsById,
    },
  },
  maxRetries: 0,
  abortSignal: generationSignal,
})

const chosenId = result.answers.selectedMenu.choice
// Resolver contra el mapa de propuestas del servidor y validar antes de devolver.
```

AI SDK usa `state`, preguntas por nombre y `criteria`; no copiar aquí el cuerpo REST de OpenAI con `input` y arrays de preguntas. La salida `choice` permite seleccionar claves de opciones. [Contrato de Gateway](https://vercel.com/docs/ai-gateway/modalities/decision).

No establecer un umbral arbitrario de confianza para aceptar menús. Las distribuciones pueden ser opcionales según la integración y no son una garantía de calidad. Primero evaluar las elecciones con ejemplos revisados. [Semántica y errores de AI SDK](https://ai-sdk.dev/docs/ai-sdk-core/decisions).

### 5.3 Validación y presupuesto de ejecución

- Resolver exclusivamente una opción existente en el mapa de propuestas del servidor. Una elección desconocida o una respuesta malformada no se repara inventando otra asignación atribuida al modelo.
- Validar de nuevo semana, siete días, franjas cubiertas, compatibilidad y disponibilidad de las recetas de la propuesta elegida. La validación de guardado sigue siendo obligatoria ante cambios concurrentes.
- Mantener una generación lógica por acción y el límite actual de cinco intentos por hora. Construcción de propuestas y lecturas ocurren antes del lease; solo el tramo acotado queda dentro de la exclusión de 60 segundos.
- Mantener el presupuesto remoto total de 20 segundos y `maxRetries: 0`. No encadenar varias llamadas con 20 segundos cada una ni configurar escalados a otros modelos en esta versión.
- Las precondiciones fallidas y el horario totalmente cubierto no gastan intento. Una generación válida con un único candidato pasa una vez por el guard para conservar el límite por acción, aunque no facture una llamada remota.
- Limitar y medir tamaño del estado. Si no cabe la lista finalista, reducir el número de propuestas y eliminar detalle duplicado, preservando las recetas completas que se evalúan. Si aun así no cabe, usar el tratamiento de error de selección; no recortar ingredientes silenciosamente.

## 6. Errores y alternativa local

Entrega 2, piloto de servidor: tanto la generación inicial como la regeneración fallan de forma recuperable ante errores remotos. Entrega 4: en la generación inicial, timeout, rechazo, elección inválida, límite de tasa o error desconocido devuelven el primer candidato local validado (mejor por las métricas locales) con `selectionSource: 'local'`; `auth`, `model-not-found` y toda regeneración siguen fallando. La vista previa muestra entonces el aviso localizado «Te proponemos un menú básico. Puedes revisar y cambiar los platos antes de guardarlo»; nunca se guarda automáticamente. Un único candidato válido sí se devuelve localmente y consume un intento protegido, sin petición remota. El contrato público sigue siendo `menu`, `recipeNames` y `unavailableSlots`, salvo el campo opcional `selectionSource?: 'local'`, presente solo en la alternativa local y nunca persistido.

La semana totalmente cubierta no se puede representar con el contrato actual `lunch|dinner|both`: Oficina y Comer fuera conservan al menos una franja doméstica por día. Ese caso queda diferido sin cambiar el esquema ni añadir una rama de cuota inalcanzable; un catálogo vacío no equivale a una semana cubierta.

Separar fallos de contexto/autorización de fallos de selección remota:

| Situación                                                                                | Comportamiento                                                                                                                               |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Semana actual inexistente                                                                | Continuar con historial vacío.                                                                                                               |
| Error de base de datos, sesión inválida, semana obsoleta o guard rechazado               | Mantener el tratamiento actual; no devolver una propuesta de reserva para eludirlo.                                                          |
| Primera generación: timeout, indisponibilidad, rechazo o respuesta inválida de Decisions | Si existe un candidato local validado, ofrecerlo como vista previa con aviso; nunca guardarlo automáticamente.                               |
| Regeneración con propuesta previa: fallo de Decisions                                    | Conservar la propuesta anterior y todos sus cambios manuales, con el error y reintento existentes. No sustituirla por una alternativa local. |
| Configuración de modelo o credenciales incorrecta                                        | Registrar error de configuración sin secretos y mostrar fallo recuperable; no ocultarlo como éxito de IA.                                    |
| Fallo al guardar                                                                         | Mantener la vista previa editable y permitir reintento.                                                                                      |

La alternativa local se ordena por las métricas que el código conoce. No afirmar que ha evaluado pesadez si carece de esa información. Añadir al resultado un campo opcional compatible, por ejemplo `selectionSource: 'decision' | 'local'`, para un aviso localizado: «Te proponemos un menú básico. Puedes revisar y cambiar los platos antes de guardarlo». Registrar la causa técnica solo en servidor.

Un intento que llegó al tramo protegido conserva la política actual de consumo aunque acabe en alternativa local o error. Liberar siempre el lease; no duplicar intentos por una misma acción.

## 7. Edición manual y guardado

**La propuesta es un menú normal del dominio, no un objeto especial controlado por el modelo.** Mantener `CalendarWeekMenu`, nombres de recetas y `unavailableSlots` como base del contrato público.

- Cada hueco en casa mantiene su selector actual, limitado a recetas de la misma franja y con «Sin receta» y orden alfabético actuales.
- Cambiar una receta solo modifica el borrador visible. Cero llamadas a Decisions y cero consumo de cuota.
- Se permiten repeticiones y parejas pesadas elegidas manualmente. El motor no corrige ni sobrescribe esas decisiones en segundo plano.
- «Aceptar» guarda exactamente la propuesta visible, incluidos cambios manuales. El servidor valida integridad y propiedad; no vuelve a optimizarla.
- Después de aceptar, continúan funcionando la edición habitual y las protecciones de semanas actuales/pasadas. Los cambios persistidos se usan como historial de futuras generaciones.
- Conservar la actualización existente de lista de compra y checklist derivada del menú aceptado/editado; no usar la lista de la propuesta original tras un cambio de receta.
- «Generar otra» usa el mismo horario y confirma pérdida de cambios manuales como ahora. Si falla, devuelve el borrador anterior intacto; si funciona, reemplaza solo la vista previa.
- Editar horario invalida la propuesta y exige nueva confirmación; cancelar restaura receta y horario anteriores.
- Descartar no escribe en base de datos. Una respuesta tardía, un cambio de usuario o un cierre de sesión no pueden aplicar un borrador de otra generación/cuenta.

## 8. Cambios previstos y secuencia de entrega

Nombres orientativos para módulos nuevos: `menu-candidates.ts` para construcción y métricas, `menu-decision.ts` para Gateway. Evitar renombrados generales de componentes, rutas o tipos solo para quitar «AI» del nombre.

Entregar unidades pequeñas y operativas; cada PR debe cumplir las comprobaciones del repositorio y el límite de tamaño. Si una unidad crece, dividirla antes de continuar.

Flujo de ramas: todas las PR apuntan a `main` y no se hacen commits ni pushes directos a `main`. Las PR de la serie se ejecutan en orden secuencial: una PR solo se considera terminada cuando está en verde en CI, verificada, revisada y fusionada. Después se crea la siguiente rama desde un `origin/main` actualizado. No hay PR con base en otra rama ni stacks.

1. **Planificador local integrado:** definir primero fallos y casos E2E; extraer validación común y usar la construcción de propuestas en la asignación local/de reparación existente. El camino actual sigue operativo y las funciones nuevas tienen uso real.
2. **Selección con Decisions:** añadir configuración, adaptador Gateway, resolución de opciones y tratamiento de errores. Integrar el camino completo con aviso de alternativa local y fixtures deterministas, conservando edición/aceptación. Introducir `AI_WEEKLY_MENU_ENGINE=legacy|decisions` con `legacy` como valor por defecto: sin credencial real y evaluación aprobada, el comportamiento por defecto no cambia. Actualizar `.env.example` solo con nombres/placeholders y documentación de operación.
3. **Evaluación y activación:** ejecutar la comparación real una vez configurada la credencial, ajustar rúbrica con recetas revisadas y activar la selección al superar los criterios de calidad. Para un piloto reversible se usa `AI_WEEKLY_MENU_ENGINE`, validada, con `legacy` como valor por defecto hasta aprobar la evaluación.
4. **Retirada del camino anterior:** tras validar el piloto, eliminar generador antiguo y selector temporal. Conservar únicamente el planificador, Decisions y la alternativa local documentada.

No hacen falta cambios de base de datos para esta primera versión. Cualquier futura etiqueta persistida de pesadez requerirá su propio cambio de esquema, migración, formulario y plan de compatibilidad.

## 9. Verificación y artefactos

Seguir la convención del repositorio: escribir escenarios y formas de fallo **antes del código**; priorizar E2E. Extender los harness existentes en vez de crear una segunda infraestructura. Los mocks de decisiones deben ejercitar el adaptador de selección, no limitarse a devolver un menú prefabricado desde el navegador.

| Caso                                                                | Evidencia exigida                                                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Semana actual completa, parcial, ausente y solo con horario         | La generación funciona en los cuatro casos y usa únicamente historial disponible. Una lectura fallida sigue siendo un error, no «ausente». |
| Receta fuera de la página visible del catálogo                      | Puede entrar en las propuestas; no hay filtrado por paginación.                                                                            |
| Solo comidas, solo cenas, catálogo pequeño y borrado concurrente    | Respeta tipos, permite repeticiones necesarias y comunica huecos sin inventar IDs.                                                         |
| Oficina, comer fuera y semana sin huecos domésticos                 | Cero recetas en huecos cubiertos; ningún request remoto si todos están cubiertos.                                                          |
| Historial reciente                                                  | La construcción local reduce repeticiones evitables con alternativas equivalentes y la selección respeta esa preferencia sin dejar huecos. |
| Platos contundentes y ligeros revisados                             | Existen propuestas con parejas adecuadas; el modelo prefiere esas frente a parejas pesadas equivalentes.                                   |
| Todas las recetas pesadas o ambiguas                                | Completa lo posible y no afirma equilibrio nutricional ni inventa propiedades.                                                             |
| Selección inválida, rechazo, timeout y configuración ausente        | Comportamiento de la sección 6, sin guardado ni pérdida de datos.                                                                          |
| Edición manual en vista previa y tras aceptar                       | Cambia solo el hueco elegido; persiste al recargar tras guardar; lista de compra refleja la receta final.                                  |
| Editar, regenerar, cancelar y regenerar con fallo                   | Confirma pérdida cuando corresponde y restaura el borrador con sus cambios en los casos previstos.                                         |
| Dos peticiones, límite horario, cambio de semana y cambio de sesión | Exclusión/cuota correctas, lease liberado y ningún resultado aplicado a una cuenta o semana incorrecta.                                    |

Artefactos propuestos, a producir durante la implementación, no existentes por este documento:

- `frontend/e2e/artifacts/weekly-menu-decisions-results.json`: escenario, entrada controlada, semilla, versión del algoritmo/rúbrica, candidatos, opción seleccionada, origen local/remoto y aserciones.
- Capturas de vista previa, cambio manual, recuperación de fallo y menú aceptado.
- Informe de comparación con recetas de prueba revisadas: propuestas originales, elección, valoración humana, repeticiones, parejas pesadas evitables, latencia, tokens/coste cuando estén disponibles y fallos. Separar resultados del modelo de preferencias humanas y de garantías verificadas por código.

Comandos base desde `frontend/`, durante la implementación:

```bash
pnpm lint
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm e2e:real-stack e2e/real-stack/ai-weekly-menu.scenario.js
```

Ampliar el escenario real existente y ejecutar también el harness de interfaz documentado en [AI-WEEKLY-MENU.md](../frontend/e2e/AI-WEEKLY-MENU.md). Documentar comandos exactos y resultados, fixtures y capturas. Si se añaden pruebas aisladas del transporte, enumerar primero todos los fallos y escribirlas antes del adaptador.

Los E2E con fixtures no prueban calidad del modelo. Añadir una ejecución real pequeña, explícita y separada cuando haya credenciales; registrar modelo y versiones sin guardar claves ni datos personales. No convertir esa ejecución variable en requisito de red de todos los tests.

## 10. Criterios de activación y decisiones pendientes

Para activar Decisions deben cumplirse estas condiciones:

- Reglas obligatorias y flujos de edición/aceptación pasan los escenarios repetibles sin regresiones.
- No se gasta una llamada por editar manualmente; cada generación remota usa una sola selección.
- El conjunto revisado incluye casos con historia ausente y parejas pesadas evitables. No hay violaciones conocidas de las reglas obligatorias y se documentan los errores de juicio culinario.
- Comparar contra el generador actual **y contra la selección local**, usando las mismas entradas. Medir tasa de aceptación sin cambios, número de cambios y regeneraciones en piloto; son señales de utilidad, no una medida nutricional.
- Acordar antes del piloto los límites aceptables de fallos, latencia y coste a partir de la línea base medida. No asumir mejoras por las cifras generales del proveedor.
- Registrar versión de rúbrica/algoritmo, modelo, cantidad de candidatos, disponibilidad de historial, origen de selección, duración y resultado técnico. No registrar ingredientes/nombres completos por defecto ni campos de tokens desconocidos como cero.
- Verificar retorno al motor anterior durante el piloto y declarar lo que no se haya probado.

Pendiente para ejecución real: credencial de Gateway proporcionada por el usuario, acceso al modelo elegido y revisión de ejemplos de «pesado/ligero/desconocido». La arquitectura, fixtures y casos E2E pueden prepararse sin esos secretos. Este documento no instala paquetes, no llama a modelos de pago y no activa la funcionalidad.
