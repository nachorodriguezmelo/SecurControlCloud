-- ==============================================================================
-- ESQUEMA DE BASE DE DATOS PARA SECURCONTROL (GESTIÓN DE PROYECTOS CCTV)
-- Ejecutar este script completo en el "SQL Editor" de tu proyecto en Supabase
-- ==============================================================================

-- 1. Tabla Maestra de Proyectos
CREATE TABLE public.proyectos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  cliente TEXT NOT NULL,
  ubicacion TEXT,
  estado TEXT NOT NULL DEFAULT 'En ejecución' CHECK (estado IN ('En cotización', 'En ejecución', 'Finalizado')),
  presupuesto_clp NUMERIC NOT NULL DEFAULT 0,
  valor_hora_hh NUMERIC NOT NULL DEFAULT 15000,
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Actividades / Hitos Técnicos
CREATE TABLE public.actividades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tecnico_asignado TEXT,
  completada BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Gastos y Materiales
CREATE TABLE public.gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Materiales/Equipos',
  monto_clp NUMERIC NOT NULL DEFAULT 0,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Registro de Horas Hombre (HH)
CREATE TABLE public.registros_tiempo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  tecnico TEXT NOT NULL,
  horas NUMERIC(5,2) NOT NULL DEFAULT 0,
  tarea TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- Permite acceso completo solo a usuarios autenticados en el sistema
-- ==============================================================================
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_tiempo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso total usuarios autenticados - proyectos" ON public.proyectos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acceso total usuarios autenticados - actividades" ON public.actividades
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acceso total usuarios autenticados - gastos" ON public.gastos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acceso total usuarios autenticados - tiempo" ON public.registros_tiempo
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- DATOS DE EJEMPLO INICIALES (OPCIONAL)
-- ==============================================================================
DO $$
DECLARE
  p1_id UUID;
BEGIN
  INSERT INTO public.proyectos (nombre, cliente, ubicacion, estado, presupuesto_clp, valor_hora_hh, fecha_inicio)
  VALUES ('Instalación 16 Cámaras IP PoE + NVR', 'Bodega Central Sur', 'Ruta 5 Sur Km 480', 'En ejecución', 3450000, 18000, CURRENT_DATE - 5)
  RETURNING id INTO p1_id;

  INSERT INTO public.actividades (proyecto_id, titulo, tecnico_asignado, completada) VALUES
    (p1_id, 'Visita técnica y levantamiento de planos', 'Carlos M.', true),
    (p1_id, 'Tendido de cable UTP Cat6 exterior y canalización', 'Carlos M.', true),
    (p1_id, 'Montaje de cámaras domo/bullet y cajas estancas', 'Andrés R.', false),
    (p1_id, 'Configuración NVR, RAID y acceso móvil Hik-Connect', 'Carlos M.', false);

  INSERT INTO public.gastos (proyecto_id, descripcion, categoria, monto_clp, fecha) VALUES
    (p1_id, 'NVR 16 Canales PoE + Disco Duro 4TB Surveillance', 'Materiales/Equipos', 680000, CURRENT_DATE - 4),
    (p1_id, '16 Cámaras IP 4MP ColorVu + Cajas Estancas', 'Materiales/Equipos', 1120000, CURRENT_DATE - 4),
    (p1_id, '2 Bobinas Cable UTP Cat6 100% Cobre + Conectores', 'Materiales/Equipos', 210000, CURRENT_DATE - 3);

  INSERT INTO public.registros_tiempo (proyecto_id, tecnico, horas, tarea, fecha) VALUES
    (p1_id, 'Carlos M.', 8, 'Levantamiento y canalización perimetral', CURRENT_DATE - 3),
    (p1_id, 'Andrés R.', 8, 'Tendido de cableado estructurado', CURRENT_DATE - 2);
END $$;
