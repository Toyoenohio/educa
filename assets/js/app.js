// EDUCA App - MVP
// Configuración Supabase
const SUPABASE_URL = 'https://mloffflzgizbyqwhdukl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sb2ZmZmx6Z2l6Ynlxd2hkdWtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzExNzIsImV4cCI6MjA5MTI0NzE3Mn0.WgDVTqRAQBLLr-zp0xJGzpklKMnv8tRhRV9M3VXa49M';

// Inicializar Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado global
let currentUser = null;
let userRole = 'admin'; // 'admin' o 'student'
let students = [];
let courses = [];
let enrollments = [];

// ============================================
// TIPO DE LOGIN
// ============================================
function setLoginType(type) {
    userRole = type;
    document.getElementById('login-type-admin').className = type === 'admin' 
        ? 'flex-1 py-2 rounded-md text-sm font-medium bg-white shadow text-indigo-600'
        : 'flex-1 py-2 rounded-md text-sm font-medium text-gray-500';
    document.getElementById('login-type-student').className = type === 'student'
        ? 'flex-1 py-2 rounded-md text-sm font-medium bg-white shadow text-indigo-600'
        : 'flex-1 py-2 rounded-md text-sm font-medium text-gray-500';
    
    document.getElementById('student-register-link').classList.toggle('hidden', type === 'admin');
}

function showStudentRegister() {
    document.getElementById('student-register-form').classList.remove('hidden');
    document.getElementById('login-form').classList.add('hidden');
}

function hideStudentRegister() {
    document.getElementById('student-register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
}

// Registro de estudiante - El trigger en BD crea el perfil y estudiante automáticamente
document.getElementById('register-student-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        // Crear usuario en auth con metadata - el trigger crea perfil y estudiante
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    full_name: data.full_name,
                    id_number: data.id_number,
                    phone: data.phone,
                    location: data.location,
                    role: 'student'
                }
            }
        });
        
        if (authError) throw authError;
        
        // Esperar un momento para que el trigger se ejecute
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar si el estudiante fue creado
        const { data: studentCheck, error: checkError } = await supabaseClient
            .from('students')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();
        
        // Si no existe, crearlo manualmente
        if (!studentCheck && !checkError) {
            const studentCode = generateStudentCode(data.location);
            const { error: insertError } = await supabaseClient.from('students').insert([{
                id: authData.user.id,
                code: studentCode,
                full_name: data.full_name,
                id_number: data.id_number,
                phone: data.phone,
                email: data.email,
                location: data.location,
                status: 'active'
            }]);
            
            if (insertError) {
                console.error('Error creating student manually:', insertError);
            } else {
                console.log('Student created manually with code:', studentCode);
            }
        }
        
        showToast('Cuenta creada exitosamente. Ahora puedes iniciar sesión.');
        hideStudentRegister();
        document.getElementById('login-email').value = data.email;
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
        console.error('Registration error:', err);
    }
});

// ============================================
// UTILIDADES
// ============================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    toastMessage.textContent = message;
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300 z-50 ${
        type === 'error' ? 'bg-red-600' : 'bg-green-600'
    } text-white`;
    toast.classList.remove('translate-y-20');
    setTimeout(() => {
        toast.classList.add('translate-y-20');
    }, 3000);
}

function formatCurrency(amount, currency = 'USD') {
    return currency === 'USD' 
        ? `$${parseFloat(amount).toFixed(2)}`
        : `Bs. ${parseFloat(amount).toFixed(2)}`;
}

function generateStudentCode(location) {
    const prefix = 'US';
    const loc = location || 'ANZ'; // Default location
    const random = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}-${loc}-${random}`;
}

// Generar referencia de pago para efectivo
function generatePaymentReference(method, currency) {
    if (method !== 'cash_usd' && method !== 'cash_bs') {
        return ''; // Solo para efectivo
    }
    const prefix = 'EF';
    const curr = currency === 'BS' ? 'BS' : 'USD';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}-${curr}-${date}-${random}`;
}

// ============================================
// NAVEGACIÓN
// ============================================
function showView(viewName) {
    // Ocultar todas las vistas
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    const viewEl = document.getElementById(`${viewName}-view`);
    if (viewEl) viewEl.classList.remove('hidden');
    
    // Actualizar navegación
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
        btn.classList.add('text-gray-500');
    });
    const navBtn = document.querySelector(`[data-view="${viewName}"]`);
    if (navBtn) {
        navBtn.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
        navBtn.classList.remove('text-gray-500');
    }
    
    // Cargar datos según vista
    if (viewName === 'dashboard') loadDashboard();
    if (viewName === 'students') loadStudents();
    if (viewName === 'courses') loadCourses();
}

// ============================================
// AUTENTICACIÓN
// ============================================
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    const errorEl = document.getElementById('login-error');
    
    btn.classList.add('loading');
    btn.textContent = 'Ingresando...';
    errorEl.classList.add('hidden');
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        
        if (error) throw error;
        
        currentUser = data.user;
        
        // Verificar si es admin o estudiante
        const { data: adminData } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (adminData) {
            userRole = 'admin';
            showAdminView();
        } else {
            // Es estudiante
            userRole = 'student';
            showStudentView();
        }
        
        showToast('¡Bienvenido a EDUCA!');
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
    } finally {
        btn.classList.remove('loading');
        btn.textContent = 'Ingresar';
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    currentUser = null;
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');
});

// Verificar sesión al cargar
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        
        // Verificar si es admin o estudiante
        const { data: adminData } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (adminData) {
            userRole = 'admin';
            showAdminView();
        } else {
            userRole = 'student';
            showStudentView();
        }
    }
}

// Mostrar vista de admin
function showAdminView() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    document.getElementById('user-name').textContent = currentUser.email;
    
    // Mostrar navegación completa
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('hidden'));
    
    loadDashboard();
}

// Mostrar vista de estudiante
async function showStudentView() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    
    // Ocultar todas las vistas primero
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    
    // Mostrar solo la vista de perfil
    const profileView = document.getElementById('profile-view');
    if (profileView) profileView.classList.remove('hidden');
    
    // Ocultar navegación de admin
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.add('hidden');
    });
    
    // Mostrar solo el botón de perfil si existe
    const profileBtn = document.querySelector('[data-view="profile"]');
    if (profileBtn) {
        profileBtn.classList.remove('hidden');
        profileBtn.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
    }
    
    document.getElementById('user-name').textContent = currentUser.email;
    
    // Cargar perfil del estudiante
    try {
        await loadStudentProfile(currentUser.id);
    } catch (err) {
        console.error('Error loading profile:', err);
        document.getElementById('profile-content').innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500">Error cargando tu perfil. Intenta recargar la página.</p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Recargar</button>
            </div>
        `;
    }
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    try {
        // Estudiantes activos
        const { count: activeStudents } = await supabaseClient
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
        document.getElementById('stat-active-students').textContent = activeStudents || 0;
        
        // Cursos activos
        const { count: activeCourses } = await supabaseClient
            .from('courses')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
        document.getElementById('stat-active-courses').textContent = activeCourses || 0;
        
        // Pagos de hoy
        const today = new Date().toISOString().split('T')[0];
        const { count: todayPayments, data: todayData } = await supabaseClient
            .from('payments')
            .select('*', { count: 'exact' })
            .gte('registered_at', today);
        document.getElementById('stat-today-payments').textContent = todayPayments || 0;
        
        // Recaudado este mes
        const monthStart = new Date();
        monthStart.setDate(1);
        const { data: monthPayments } = await supabaseClient
            .from('payments')
            .select('amount')
            .gte('registered_at', monthStart.toISOString());
        const monthTotal = monthPayments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
        document.getElementById('stat-month-revenue').textContent = formatCurrency(monthTotal);
        
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

// ============================================
// ESTUDIANTES
// ============================================
function showStudentForm() {
    document.getElementById('student-form-container').classList.remove('hidden');
}

function hideStudentForm() {
    document.getElementById('student-form-container').classList.add('hidden');
    document.getElementById('student-form').reset();
}

document.getElementById('student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Generar código único basado en sede
    data.code = generateStudentCode(data.location);
    
    try {
        const { error } = await supabaseClient.from('students').insert([data]);
        if (error) throw error;
        
        showToast('Estudiante registrado. Ahora el estudiante debe registrarse en "Iniciar sesión > Estudiante > Registrarse" usando el mismo email.');
        hideStudentForm();
        loadStudents();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
});

async function loadStudents() {
    try {
        const { data, error } = await supabaseClient
            .from('students')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        students = data || [];
        renderStudentsList(students);
    } catch (err) {
        showToast('Error cargando estudiantes', 'error');
    }
}

function renderStudentsList(data) {
    const tbody = document.getElementById('students-list');
    tbody.innerHTML = data.map(student => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm font-mono text-gray-600">${student.code}</td>
            <td class="px-4 py-3 text-sm font-medium">${student.full_name}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${student.phone}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs rounded-full ${
                    student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }">${student.status}</span>
            </td>
            <td class="px-4 py-3 text-sm">
                <button onclick="viewStudent('${student.id}')" class="text-indigo-600 hover:text-indigo-800">Ver</button>
            </td>
        </tr>
    `).join('');
}

// Buscar estudiantes
document.getElementById('student-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = students.filter(s => 
        s.full_name.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        s.phone.includes(query)
    );
    renderStudentsList(filtered);
});

function viewStudent(id) {
    // TODO: Modal o vista detallada del estudiante
    showToast('Vista detallada en desarrollo');
}

// ============================================
// CURSOS
// ============================================
async function loadCourses() {
    try {
        const { data, error } = await supabaseClient
            .from('cycles')
            .select(`
                *,
                courses (*)
            `)
            .order('start_date', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('cycles-container');
        container.innerHTML = data.map(cycle => `
            <div class="bg-white rounded-xl shadow p-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-lg font-semibold">${cycle.name}</h3>
                        <p class="text-sm text-gray-500">${cycle.start_date} - ${cycle.end_date}</p>
                    </div>
                    <span class="px-3 py-1 text-xs rounded-full ${
                        cycle.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }">${cycle.status}</span>
                </div>
                <div class="space-y-2">
                    ${cycle.courses?.map(course => `
                        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p class="font-medium">${course.name}</p>
                                <p class="text-sm text-gray-500">${course.code}</p>
                            </div>
                            <span class="text-sm text-gray-600">${course.schedule_days || 'Sin horario'}</span>
                        </div>
                    `).join('') || '<p class="text-gray-400 text-sm">No hay cursos en este ciclo</p>'}
                </div>
            </div>
        `).join('');
    } catch (err) {
        showToast('Error cargando cursos', 'error');
    }
}

function showCycleForm() {
    showToast('Formulario de nuevo ciclo en desarrollo');
}

// ============================================
// PAGOS
// ============================================
let selectedStudent = null;

document.getElementById('payment-student-search').addEventListener('input', async (e) => {
    const query = e.target.value;
    if (query.length < 3) {
        document.getElementById('payment-student-results').classList.add('hidden');
        return;
    }
    
    try {
        // Buscar solo estudiantes activos, sin requerir inscripción
        const { data, error } = await supabaseClient
            .from('students')
            .select('*, enrollments(*, courses(*))')
            .or(`full_name.ilike.%${query}%,code.ilike.%${query}%`)
            .eq('status', 'active')
            .limit(5);
        
        if (error) throw error;
        
        const resultsDiv = document.getElementById('payment-student-results');
        if (data && data.length > 0) {
            resultsDiv.innerHTML = data.map(student => {
                const enrollment = student.enrollments?.[0];
                const courseName = enrollment?.courses?.name || 'Sin curso activo';
                return `
                <div class="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-0" 
                     onclick="selectStudentForPayment('${student.id}', '${student.full_name}', '${student.code}', '${enrollment?.id || ''}')">
                    <p class="font-medium">${student.full_name}</p>
                    <p class="text-sm text-gray-500">${student.code} - ${courseName}</p>
                </div>
            `}).join('');
            resultsDiv.classList.remove('hidden');
        } else {
            resultsDiv.innerHTML = '<div class="p-3 text-gray-500">No se encontraron estudiantes</div>';
            resultsDiv.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Error searching students:', err);
    }
});

function selectStudentForPayment(id, name, code, enrollmentId) {
    selectedStudent = { id, name, code, enrollmentId };
    document.getElementById('payment-student-id').value = id;
    document.getElementById('payment-enrollment-id').value = enrollmentId;
    document.getElementById('payment-student-search').value = name;
    document.getElementById('payment-student-results').classList.add('hidden');
    
    document.getElementById('payment-student-info').innerHTML = `
        <p class="font-medium">${name}</p>
        <p class="text-sm text-gray-600">${code}</p>
    `;
    document.getElementById('payment-student-info').classList.remove('hidden');
}

document.getElementById('payment-method').addEventListener('change', (e) => {
    const method = e.target.value;
    const currency = document.querySelector('[name="currency"]').value || 'USD';
    const referenceInput = document.getElementById('payment-reference');
    const hint = document.getElementById('reference-hint');
    
    if (method === 'cash_usd' || method === 'cash_bs') {
        referenceInput.value = generatePaymentReference(method, currency);
        referenceInput.readOnly = true;
        hint.classList.remove('hidden');
    } else {
        referenceInput.value = '';
        referenceInput.readOnly = false;
        hint.classList.add('hidden');
    }
});

// Actualizar referencia cuando cambia moneda (solo para efectivo)
document.querySelector('[name="currency"]').addEventListener('change', (e) => {
    const method = document.getElementById('payment-method').value;
    if (method === 'cash_usd' || method === 'cash_bs') {
        document.getElementById('payment-reference').value = generatePaymentReference(method, e.target.value);
    }
});

document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    if (!selectedStudent) {
        showToast('Debe seleccionar un estudiante', 'error');
        return;
    }
    
    // Si no hay inscripción, permitir igual (para testing)
    data.enrollment_id = selectedStudent.enrollmentId || null;
    data.registered_by = currentUser.id;
    
    try {
        const { error } = await supabaseClient.from('payments').insert([data]);
        if (error) throw error;
        
        showToast('Pago registrado exitosamente');
        e.target.reset();
        document.getElementById('payment-student-info').classList.add('hidden');
        selectedStudent = null;
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
});

// ============================================
// INICIALIZACIÓN
// ============================================
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
});

checkSession();

// Asistencia (placeholder)
function loadAttendanceView() {
    showToast('Módulo de asistencia en desarrollo');
}

// ============================================
// CICLOS
// ============================================
function showCycleForm() {
    document.getElementById('cycle-form-container').classList.remove('hidden');
}

function hideCycleForm() {
    document.getElementById('cycle-form-container').classList.add('hidden');
    document.getElementById('cycle-form').reset();
}

document.getElementById('cycle-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.created_by = currentUser.id;
    
    try {
        const { error } = await supabaseClient.from('cycles').insert([data]);
        if (error) throw error;
        
        showToast('Ciclo creado exitosamente');
        hideCycleForm();
        loadCourses();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
});

// ============================================
// CURSOS
// ============================================
function showCourseForm() {
    loadCyclesForSelect();
    document.getElementById('course-form-container').classList.remove('hidden');
}

function hideCourseForm() {
    document.getElementById('course-form-container').classList.add('hidden');
    document.getElementById('course-form').reset();
}

async function loadCyclesForSelect() {
    try {
        const { data, error } = await supabaseClient
            .from('cycles')
            .select('*')
            .in('status', ['upcoming', 'active'])
            .order('start_date', { ascending: false });
        
        if (error) throw error;
        
        const select = document.getElementById('course-cycle-select');
        select.innerHTML = '<option value="">Seleccionar ciclo...</option>' +
            data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (err) {
        console.error('Error loading cycles:', err);
    }
}

document.getElementById('course-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.created_by = currentUser.id;
    data.status = 'upcoming';
    
    try {
        const { error } = await supabaseClient.from('courses').insert([data]);
        if (error) throw error;
        
        showToast('Curso creado exitosamente');
        hideCourseForm();
        loadCourses();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
});

// ============================================
// INSCRIPCIONES
// ============================================
let selectedStudentForEnrollment = null;

function showEnrollmentForm() {
    loadCoursesForEnrollment();
    document.getElementById('enrollment-form-container').classList.remove('hidden');
}

function hideEnrollmentForm() {
    document.getElementById('enrollment-form-container').classList.add('hidden');
    document.getElementById('enrollment-form').reset();
    selectedStudentForEnrollment = null;
}

async function loadCoursesForEnrollment() {
    try {
        const { data, error } = await supabaseClient
            .from('courses')
            .select('*, cycles(name)')
            .in('status', ['upcoming', 'active'])
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const select = document.getElementById('enrollment-course-select');
        select.innerHTML = '<option value="">Seleccionar curso...</option>' +
            data.map(c => `<option value="${c.id}">${c.name} - ${c.cycles.name}</option>`).join('');
    } catch (err) {
        console.error('Error loading courses:', err);
    }
}

document.getElementById('enrollment-student-search')?.addEventListener('input', async (e) => {
    const query = e.target.value;
    if (query.length < 3) {
        document.getElementById('enrollment-student-results').classList.add('hidden');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('students')
            .select('*')
            .or(`full_name.ilike.%${query}%,code.ilike.%${query}%`)
            .eq('status', 'active')
            .limit(5);
        
        if (error) throw error;
        
        const resultsDiv = document.getElementById('enrollment-student-results');
        if (data && data.length > 0) {
            resultsDiv.innerHTML = data.map(student => `
                <div class="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-0" 
                     onclick="selectStudentForEnrollment('${student.id}', '${student.full_name}', '${student.code}')">
                    <p class="font-medium">${student.full_name}</p>
                    <p class="text-sm text-gray-500">${student.code}</p>
                </div>
            `).join('');
            resultsDiv.classList.remove('hidden');
        } else {
            resultsDiv.innerHTML = '<div class="p-3 text-gray-500">No se encontraron estudiantes</div>';
            resultsDiv.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Error searching students:', err);
    }
});

function selectStudentForEnrollment(id, name, code) {
    selectedStudentForEnrollment = { id, name, code };
    document.getElementById('enrollment-student-id').value = id;
    document.getElementById('enrollment-student-search').value = name;
    document.getElementById('enrollment-student-results').classList.add('hidden');
}

document.getElementById('enrollment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    if (!data.student_id) {
        showToast('Debe seleccionar un estudiante', 'error');
        return;
    }
    
    data.enrolled_by = currentUser.id;
    
    try {
        const { error } = await supabaseClient.from('enrollments').insert([data]);
        if (error) throw error;
        
        showToast('Estudiante inscrito exitosamente');
        hideEnrollmentForm();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
});

// ============================================
// VISTA DE PERFIL PARA ESTUDIANTES
// ============================================
async function loadStudentProfile(studentId) {
    try {
        // Cargar datos del estudiante - usar maybeSingle para evitar error si no existe
        const { data: student, error: studentError } = await supabaseClient
            .from('students')
            .select('*')
            .eq('id', studentId)
            .maybeSingle();
        
        if (studentError) {
            console.error('Student query error:', studentError);
            throw studentError;
        }
        
        if (!student) {
            document.getElementById('profile-content').innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-500">No se encontró tu perfil de estudiante.</p>
                    <p class="text-sm text-gray-400 mt-2">Esto puede tardar unos segundos en actualizarse.</p>
                    <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Intentar de nuevo</button>
                </div>
            `;
            return;
        }
        
        // Cargar inscripciones activas
        const { data: enrollments, error: enrollmentsError } = await supabaseClient
            .from('enrollments')
            .select('*, courses(*, cycles(*))')
            .eq('student_id', studentId)
            .eq('status', 'active');
        
        if (enrollmentsError) {
            console.error('Enrollments error:', enrollmentsError);
            throw enrollmentsError;
        }
        
        // Cargar pagos
        let payments = [];
        if (enrollments && enrollments.length > 0) {
            const enrollmentIds = enrollments.map(e => e.id);
            const { data: paymentsData, error: paymentsError } = await supabaseClient
                .from('payments')
                .select('*')
                .in('enrollment_id', enrollmentIds);
            
            if (paymentsError) {
                console.error('Payments error:', paymentsError);
            } else {
                payments = paymentsData || [];
            }
        }
        
        // Renderizar perfil
        const container = document.getElementById('profile-content');
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-gray-50 p-4 rounded-xl">
                    <h3 class="font-semibold text-gray-700 mb-3">Información Personal</h3>
                    <div class="space-y-2 text-sm">
                        <p><span class="text-gray-500">Código:</span> <span class="font-mono">${student.code || 'N/A'}</span></p>
                        <p><span class="text-gray-500">Nombre:</span> ${student.full_name || 'N/A'}</p>
                        <p><span class="text-gray-500">Teléfono:</span> ${student.phone || 'N/A'}</p>
                        <p><span class="text-gray-500">Email:</span> ${student.email || currentUser.email}</p>
                        <p><span class="text-gray-500">Sede:</span> ${student.location || 'N/A'}</p>
                    </div>
                </div>
                <div>
                    <h3 class="font-semibold text-gray-700 mb-3">Cursos Activos</h3>
                    ${enrollments?.length > 0 ? enrollments.map(e => `
                        <div class="bg-indigo-50 p-4 rounded-xl mb-3">
                            <p class="font-medium text-indigo-900">${e.courses?.name || 'Curso'}</p>
                            <p class="text-sm text-indigo-600">${e.courses?.cycles?.name || ''}</p>
                            <div class="mt-2 flex justify-between text-sm">
                                <span class="text-gray-600">Semanas pagadas:</span>
                                <span class="font-semibold">${e.weeks_paid || 0} / 15</span>
                            </div>
                            <div class="mt-1 w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-indigo-600 h-2 rounded-full" style="width: ${Math.min(((e.weeks_paid || 0) / 15) * 100, 100)}%"></div>
                            </div>
                        </div>
                    `).join('') : '<p class="text-gray-500 bg-gray-50 p-4 rounded-xl">No estás inscrito en ningún curso activo.</p>'}
                </div>
            </div>
            
            <div class="mt-6">
                <h3 class="font-semibold text-gray-700 mb-3">Historial de Pagos</h3>
                ${payments?.length > 0 ? `
                    <div class="overflow-x-auto bg-white rounded-xl border">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Semanas</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y">
                                ${payments.map(p => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-4 py-3 text-sm">${p.registered_at ? new Date(p.registered_at).toLocaleDateString() : '-'}</td>
                                        <td class="px-4 py-3 text-sm font-medium">${formatCurrency(p.amount, p.currency)}</td>
                                        <td class="px-4 py-3 text-sm capitalize">${p.method ? p.method.replace('_', ' ') : '-'}</td>
                                        <td class="px-4 py-3 text-sm">${p.weeks_covered || 1}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<p class="text-gray-500 bg-gray-50 p-4 rounded-xl">No hay pagos registrados aún.</p>'}
            </div>
        `;
        
    } catch (err) {
        console.error('Error loading profile:', err);
        document.getElementById('profile-content').innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500">Error cargando tu perfil: ${err.message}</p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Recargar página</button>
            </div>
        `;
    }
}

// Función para mostrar perfil (puede ser llamada desde URL o botón)
function showStudentProfile(studentId) {
    if (!studentId) {
        showToast('ID de estudiante no proporcionado', 'error');
        return;
    }
    loadStudentProfile(studentId);
}
