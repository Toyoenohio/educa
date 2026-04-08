// EDUCA App - MVP
// Configuración Supabase
const SUPABASE_URL = 'https://mloffflzgizbyqwhdukl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sb2ZmZmx6Z2l6Ynlxd2hkdWtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzExNzIsImV4cCI6MjA5MTI0NzE3Mn0.WgDVTqRAQBLLr-zp0xJGzpklKMnv8tRhRV9M3VXa49M';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado global
let currentUser = null;
let students = [];
let courses = [];
let enrollments = [];

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

function generateStudentCode(paymentMethod, currency) {
    const prefix = 'EF';
    const curr = currency || 'USD';
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
    document.getElementById(`${viewName}-view`).classList.remove('hidden');
    
    // Actualizar navegación
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
        btn.classList.add('text-gray-500');
    });
    document.querySelector(`[data-view="${viewName}"]`).classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
    document.querySelector(`[data-view="${viewName}"]`).classList.remove('text-gray-500');
    
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
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) throw error;
        
        currentUser = data.user;
        document.getElementById('login-view').classList.add('hidden');
        document.getElementById('app-view').classList.remove('hidden');
        document.getElementById('user-name').textContent = currentUser.email;
        
        showToast('¡Bienvenido a EDUCA!');
        loadDashboard();
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
    } finally {
        btn.classList.remove('loading');
        btn.textContent = 'Ingresar';
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    currentUser = null;
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');
});

// Verificar sesión al cargar
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        document.getElementById('login-view').classList.add('hidden');
        document.getElementById('app-view').classList.remove('hidden');
        document.getElementById('user-name').textContent = currentUser.email;
        loadDashboard();
    }
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    try {
        // Estudiantes activos
        const { count: activeStudents } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
        document.getElementById('stat-active-students').textContent = activeStudents || 0;
        
        // Cursos activos
        const { count: activeCourses } = await supabase
            .from('courses')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
        document.getElementById('stat-active-courses').textContent = activeCourses || 0;
        
        // Pagos de hoy
        const today = new Date().toISOString().split('T')[0];
        const { count: todayPayments, data: todayData } = await supabase
            .from('payments')
            .select('*', { count: 'exact' })
            .gte('registered_at', today);
        document.getElementById('stat-today-payments').textContent = todayPayments || 0;
        
        // Recaudado este mes
        const monthStart = new Date();
        monthStart.setDate(1);
        const { data: monthPayments } = await supabase
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
    
    // Generar código único
    data.code = generateStudentCode(data.preferred_payment_method, 'USD');
    
    try {
        const { error } = await supabase.from('students').insert([data]);
        if (error) throw error;
        
        showToast('Estudiante registrado exitosamente');
        hideStudentForm();
        loadStudents();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
});

async function loadStudents() {
    try {
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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
        const { data, error } = await supabase
            .from('students')
            .select('*, enrollments!inner(*, courses(*))')
            .ilike('full_name', `%${query}%`)
            .or(`code.ilike.%${query}%`)
            .eq('enrollments.status', 'active')
            .limit(5);
        
        if (error) throw error;
        
        const resultsDiv = document.getElementById('payment-student-results');
        if (data && data.length > 0) {
            resultsDiv.innerHTML = data.map(student => `
                <div class="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-0" 
                     onclick="selectStudentForPayment('${student.id}', '${student.full_name}', '${student.code}', '${student.enrollments[0]?.id}')">
                    <p class="font-medium">${student.full_name}</p>
                    <p class="text-sm text-gray-500">${student.code} - ${student.enrollments[0]?.courses?.name || 'Sin curso'}</p>
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

document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    if (!selectedStudent || !selectedStudent.enrollmentId) {
        showToast('Debe seleccionar un estudiante con inscripción activa', 'error');
        return;
    }
    
    data.enrollment_id = selectedStudent.enrollmentId;
    data.registered_by = currentUser.id;
    
    try {
        const { error } = await supabase.from('payments').insert([data]);
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
