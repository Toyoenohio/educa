# EDUCA - Sistema de Gestión Educativa

Sistema para gestión de cursos, estudiantes, pagos y asistencia.

## Stack Tecnológico

- **Backend:** Supabase (PostgreSQL + Auth)
- **Frontend:** HTML + Tailwind CSS + Vanilla JS
- **Futuro:** Astro/React (cuando se apruebe presupuesto)

## Estructura

```
educa/
├── index.html          # App principal
├── manifest.json       # PWA manifest
├── supabase/
│   └── schema.sql      # Esquema de base de datos
└── assets/
    ├── js/
    │   └── app.js      # Lógica principal
    └── css/            # (si se necesita CSS custom)
```

## Configuración Supabase

1. Crear proyecto en [Supabase](https://supabase.com)
2. Copiar URL y anon key
3. Pegar en `assets/js/app.js` (líneas 4-5)
4. Ejecutar `supabase/schema.sql` en el SQL Editor

## Funcionalidades MVP

- [x] Login con Supabase Auth
- [x] Dashboard con estadísticas
- [x] Registro de estudiantes (con código único automático)
- [x] Listado de estudiantes con búsqueda
- [x] Gestión de cursos y ciclos
- [x] Registro de pagos (4 métodos)
- [ ] Inscripción de estudiantes a cursos
- [ ] Toma de asistencia
- [ ] Reportes

## Nomenclaturas

**Código Estudiante:** `EF-USD-08042026-03113`
- EF: Tipo programa
- USD: Moneda
- 08042026: Fecha
- 03113: Correlativo

**Código Curso:** `Inglés I - 03-26`
- Nombre + Mes-Año

## Reglas de Negocio

- 15 semanas por curso
- $10/semana
- Máximo 30% faltas
- Pagos parciales permitidos

## Desarrollo Futuro

- App para estudiantes (ver progreso, pagos)
- Integración WhatsApp
- Reportes avanzados
- Certificados digitales
