
// ============================================
// SETTINGS / CONFIGURATION
// ============================================
async function loadSettings() {
    try {
        const { data, error } = await supabaseClient
            .from('settings')
            .select('*');
        
        if (error) throw error;
        
        // Fill form fields with settings
        data.forEach(setting => {
            const input = document.getElementById(`setting-${setting.key.replace(/_/g, '-')}`);
            if (input) {
                input.value = setting.value;
            }
        });
        
    } catch (err) {
        console.error('Error loading settings:', err);
        showToast('Error cargando configuración', 'error');
    }
}

// Load and cache settings for student view
let cachedSettings = null;
async function getSettings() {
    if (cachedSettings) return cachedSettings;
    
    try {
        const { data, error } = await supabaseClient
            .from('settings')
            .select('*');
        
        if (error) throw error;
        
        cachedSettings = {};
        data.forEach(s => {
            cachedSettings[s.key] = s.value;
        });
        
        return cachedSettings;
    } catch (err) {
        console.error('Error fetching settings:', err);
        return {};
    }
}

// Update payment display info with actual settings
async function updatePaymentDisplayInfo() {
    const settings = await getSettings();
    
    // Update Pago Móvil info
    const pagoMovilBanco = document.getElementById('display-pago-movil-banco');
    const pagoMovilTelefono = document.getElementById('display-pago-movil-telefono');
    const pagoMovilRif = document.getElementById('display-pago-movil-rif');
    
    if (pagoMovilBanco) pagoMovilBanco.textContent = settings.pago_movil_banco || 'No configurado';
    if (pagoMovilTelefono) pagoMovilTelefono.textContent = settings.pago_movil_telefono || 'No configurado';
    if (pagoMovilRif) pagoMovilRif.textContent = settings.pago_movil_rif || 'No configurado';
    
    // Update Binance info
    const binanceId = document.getElementById('display-binance-id');
    const binanceNetwork = document.getElementById('display-binance-network');
    
    if (binanceId) binanceId.textContent = settings.binance_id || 'No configurado';
    if (binanceNetwork) binanceNetwork.textContent = settings.binance_network || 'TRC-20 (TRON)';
    
    // Update Efectivo info
    const efectivoDireccion = document.getElementById('display-efectivo-direccion');
    const efectivoHorario = document.getElementById('display-efectivo-horario');
    
    if (efectivoDireccion) efectivoDireccion.textContent = settings.efectivo_direccion || 'No configurado';
    if (efectivoHorario) efectivoHorario.textContent = settings.efectivo_horario || 'No configurado';
}

// Handle settings form submission
document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updates = [];
    
    // Prepare updates
    for (const [key, value] of formData.entries()) {
        updates.push({
            key: key,
            value: value,
            updated_by: currentUser.id
        });
    }
    
    try {
        // Upsert settings (insert or update)
        const { error } = await supabaseClient
            .from('settings')
            .upsert(updates, { onConflict: 'key' });
        
        if (error) throw error;
        
        // Clear cache
        cachedSettings = null;
        
        showToast('✅ Configuración guardada exitosamente');
    } catch (err) {
        showToast('Error guardando configuración: ' + err.message, 'error');
    }
});

// Auto-load settings when settings view is shown
document.querySelector('[data-view="settings"]')?.addEventListener('click', () => {
    loadSettings();
});
