-- EDUCA Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (Usuarios del sistema)
-- ============================================
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'teacher')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- 2. STUDENTS (Estudiantes)
-- ============================================
CREATE TABLE students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL, -- EF-USD-08042026-03113
    full_name TEXT NOT NULL,
    id_number TEXT NOT NULL, -- Cédula
    phone TEXT NOT NULL, -- WhatsApp
    phone_secondary TEXT,
    email TEXT,
    birth_date DATE,
    address TEXT,
    location TEXT DEFAULT 'ANZ', -- Sede: ANZ, SUC, CCS
    emergency_name TEXT,
    emergency_phone TEXT,
    preferred_payment_method TEXT CHECK (preferred_payment_method IN ('cash_usd', 'cash_bs', 'pago_movil', 'binance')),
    english_level TEXT CHECK (english_level IN ('beginner', 'elementary', 'pre_intermediate', 'intermediate', 'upper_intermediate', 'advanced')),
    referral_source TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- 3. CYCLES (Ciclos de 15 semanas)
-- ============================================
CREATE TABLE cycles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL, -- "Ciclo Marzo 2026"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    description TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- 4. COURSES (Cursos)
-- ============================================
CREATE TABLE courses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cycle_id UUID REFERENCES cycles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL, -- "Inglés I"
    code TEXT UNIQUE NOT NULL, -- "Inglés I - 03-26"
    description TEXT,
    course_type TEXT CHECK (course_type IN ('english', 'technology', 'administration', 'other')),
    max_students INTEGER DEFAULT 20,
    weeks_duration INTEGER DEFAULT 15,
    classes_per_week INTEGER DEFAULT 2,
    schedule_days TEXT, -- "Lunes, Miércoles"
    schedule_time_start TIME,
    schedule_time_end TIME,
    teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    weekly_cost DECIMAL(10,2) DEFAULT 10.00,
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    classroom TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- 5. ENROLLMENTS (Inscripciones)
-- ============================================
CREATE TABLE enrollments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    enrolled_by UUID REFERENCES profiles(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped', 'suspended', 'cancelled')),
    total_paid DECIMAL(10,2) DEFAULT 0.00,
    weeks_paid INTEGER DEFAULT 0,
    weeks_attended INTEGER DEFAULT 0,
    drop_reason TEXT,
    dropped_at TIMESTAMP WITH TIME ZONE,
    attendance_count INTEGER DEFAULT 0,
    absence_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(student_id, course_id)
);

-- ============================================
-- 6. CLASSES (Sesiones)
-- ============================================
CREATE TABLE classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 15),
    class_number INTEGER NOT NULL DEFAULT 1,
    class_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    topic TEXT,
    description TEXT,
    materials_url TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- 7. ATTENDANCES (Asistencias)
-- ============================================
CREATE TABLE attendances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(enrollment_id, class_id)
);

-- ============================================
-- 8. PAYMENTS (Pagos)
-- ============================================
CREATE TABLE payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'BS')),
    method TEXT NOT NULL CHECK (method IN ('cash_usd', 'cash_bs', 'pago_movil', 'binance')),
    reference TEXT, -- Número de referencia o código de recibo
    weeks_covered INTEGER NOT NULL DEFAULT 1,
    week_start INTEGER, -- Semana inicial cubierta
    week_end INTEGER, -- Semana final cubierta
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'rejected')),
    notes TEXT,
    registered_by UUID REFERENCES profiles(id),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- 9. EXCHANGE_RATES (Tasas de cambio)
-- ============================================
CREATE TABLE exchange_rates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    usd_to_bs DECIMAL(10,2) NOT NULL,
    source TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(date)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_students_code ON students(code);
CREATE INDEX idx_students_phone ON students(phone);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_courses_cycle ON courses(cycle_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_payments_enrollment ON payments(enrollment_id);
CREATE INDEX idx_classes_course ON classes(course_id);
CREATE INDEX idx_attendances_enrollment ON attendances(enrollment_id);
CREATE INDEX idx_attendances_class ON attendances(class_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, update own
CREATE POLICY "Profiles readable by all authenticated" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Students: Full access to authenticated users
CREATE POLICY "Students full access to authenticated" ON students
    FOR ALL USING (auth.role() = 'authenticated');

-- Cycles: Full access to authenticated users
CREATE POLICY "Cycles full access to authenticated" ON cycles
    FOR ALL USING (auth.role() = 'authenticated');

-- Courses: Full access to authenticated users
CREATE POLICY "Courses full access to authenticated" ON courses
    FOR ALL USING (auth.role() = 'authenticated');

-- Enrollments: Full access to authenticated users
CREATE POLICY "Enrollments full access to authenticated" ON enrollments
    FOR ALL USING (auth.role() = 'authenticated');

-- Classes: Full access to authenticated users
CREATE POLICY "Classes full access to authenticated" ON classes
    FOR ALL USING (auth.role() = 'authenticated');

-- Attendances: Full access to authenticated users
CREATE POLICY "Attendances full access to authenticated" ON attendances
    FOR ALL USING (auth.role() = 'authenticated');

-- Payments: Full access to authenticated users
CREATE POLICY "Payments full access to authenticated" ON payments
    FOR ALL USING (auth.role() = 'authenticated');

-- Exchange rates: Full access to authenticated users
CREATE POLICY "Exchange rates full access to authenticated" ON exchange_rates
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to generate student code
CREATE OR REPLACE FUNCTION generate_student_code(payment_method TEXT, currency TEXT)
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    currency_code TEXT;
    date_str TEXT;
    sequence_num TEXT;
BEGIN
    -- Set prefix based on course type (default to EF for now)
    prefix := 'EF';
    
    -- Set currency code
    currency_code := UPPER(currency);
    
    -- Date string DDMMYYYY
    date_str := TO_CHAR(CURRENT_DATE, 'DDMMYYYY');
    
    -- Get next sequence number for today
    SELECT LPAD(COUNT(*)::TEXT, 5, '0')
    INTO sequence_num
    FROM students
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Increment to get next number
    sequence_num := LPAD((sequence_num::INT + 1)::TEXT, 5, '0');
    
    RETURN prefix || '-' || currency_code || '-' || date_str || '-' || sequence_num;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate student stats after attendance
CREATE OR REPLACE FUNCTION update_enrollment_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update attendance/absence counts
    UPDATE enrollments
    SET 
        attendance_count = (SELECT COUNT(*) FROM attendances WHERE enrollment_id = NEW.enrollment_id AND status = 'present'),
        absence_count = (SELECT COUNT(*) FROM attendances WHERE enrollment_id = NEW.enrollment_id AND status = 'absent'),
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.enrollment_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_attendance_change AFTER INSERT OR UPDATE ON attendances
    FOR EACH ROW EXECUTE FUNCTION update_enrollment_stats();

-- Function to update enrollment after payment
CREATE OR REPLACE FUNCTION update_enrollment_after_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'confirmed' THEN
        UPDATE enrollments
        SET 
            total_paid = total_paid + NEW.amount,
            weeks_paid = weeks_paid + NEW.weeks_covered,
            updated_at = TIMEZONE('utc', NOW())
        WHERE id = NEW.enrollment_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_payment_insert AFTER INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION update_enrollment_after_payment();
