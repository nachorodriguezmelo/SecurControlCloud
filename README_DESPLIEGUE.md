# Guía Rápida de Despliegue a Producción — SecurControl

## Paso 1: Crear la Base de Datos en Supabase (5 minutos)
1. Ingresa a [supabase.com](https://supabase.com) y crea un proyecto nuevo (ej. `securcontrol-cctv`).
2. En el menú izquierdo, entra a **SQL Editor** -> **New query**.
3. Copia todo el contenido del archivo `schema.sql` incluido en este paquete y haz clic en **Run**. Esto creará las 4 tablas (`proyectos`, `actividades`, `gastos`, `registros_tiempo`), las reglas de seguridad y un proyecto de ejemplo.
4. Ve a **Authentication** -> **Users** -> **Add user** y crea tu usuario y contraseña (y los de tu socio/técnicos).
5. Ve a **Project Settings** -> **API** y copia dos valores:
   - `Project URL`
   - `anon public` key

## Paso 2: Levantar el Proyecto en tu Computador (5 minutos)
1. Crea una carpeta vacía llamada `securcontrol` y abre la terminal en ella.
2. Ejecuta:
   ```bash
   npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
   npm install @supabase/supabase-js lucide-react
   ```
3. Copia los archivos `src/lib/supabase.ts` y `src/app/page.tsx` de este ZIP dentro de tu proyecto (reemplazando `src/app/page.tsx`).
4. Crea un archivo `.env.local` en la raíz con las credenciales que copiaste de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
   ```
5. Prueba localmente ejecutando `npm run dev` y abre `http://localhost:3000`.

## Paso 3: Publicar en Internet con Vercel (3 minutos)
1. Sube la carpeta del proyecto a un repositorio privado en **GitHub**.
2. Entra a [vercel.com](https://vercel.com), haz clic en **Add New Project** e importa tu repositorio.
3. En la sección **Environment Variables**, agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Haz clic en **Deploy**. En 60 segundos tendrás tu URL pública en línea para usar desde PC y celulares.
