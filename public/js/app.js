/* ===================================
   CAR RENTAL — SPA Application Logic
   =================================== */

// ── State ──
let currentView = 'dashboard';
let carsData = [];
let bookingsData = [];

// ── DOM Refs ──
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const sidebar = $('#sidebar');
const menuToggle = $('#menu-toggle');
const modalOverlay = $('#modal-overlay');
const modalTitle = $('#modal-title');
const modalBody = $('#modal-body');
const modalClose = $('#modal-close');
const toastContainer = $('#toast-container');

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupModal();
    setupMobileMenu();
    loadDashboard();
});

// ── Navigation ──
function setupNavigation() {
    $$('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.dataset.view;
            switchView(view);
        });
    });

    $('#btn-add-car').addEventListener('click', () => openCarModal());
    $('#btn-add-booking').addEventListener('click', () => openBookingModal());
}

function switchView(viewName) {
    currentView = viewName;

    // Update nav
    $$('.nav-link').forEach(l => l.classList.remove('active'));
    $(`[data-view="${viewName}"]`).classList.add('active');

    // Update views
    $$('.view').forEach(v => v.classList.remove('active'));
    $(`#view-${viewName}`).classList.remove('active');
    // Force reflow for animation
    void $(`#view-${viewName}`).offsetWidth;
    $(`#view-${viewName}`).classList.add('active');

    // Update title
    const titles = { dashboard: 'Dashboard', cars: 'Car Fleet', bookings: 'Bookings' };
    $('#page-title').textContent = titles[viewName] || 'Dashboard';

    // Load data
    if (viewName === 'dashboard') loadDashboard();
    else if (viewName === 'cars') loadCars();
    else if (viewName === 'bookings') loadBookings();

    // Close mobile menu
    sidebar.classList.remove('open');
}

// ── Mobile Menu ──
function setupMobileMenu() {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
}

// ── API Helpers ──
async function api(url, options = {}) {
    try {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Request failed');
        return data;
    } catch (err) {
        throw err;
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

function formatDateInput(dateStr) {
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
}

// ── Toast ──
function showToast(message, type = 'success') {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ── Modal ──
function setupModal() {
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function openModal(title, bodyHTML) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHTML;
    modalOverlay.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

// ── Dashboard ──
async function loadDashboard() {
    try {
        const [cars, bookings] = await Promise.all([
            api('/cars'),
            api('/bookings')
        ]);
        carsData = cars;
        bookingsData = bookings;

        // Stats
        const available = cars.filter(c => c.status === 'available').length;
        const rented = cars.filter(c => c.status === 'rented').length;
        const maintenance = cars.filter(c => c.status === 'maintenance').length;
        const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);

        $('#stat-total-cars').textContent = cars.length;
        $('#stat-available-cars').textContent = available;
        $('#stat-total-bookings').textContent = bookings.length;
        $('#stat-revenue').textContent = formatCurrency(totalRevenue);

        // Fleet bar
        const total = cars.length || 1;
        $('#fleet-bar-available').style.width = (available / total * 100) + '%';
        $('#fleet-bar-rented').style.width = (rented / total * 100) + '%';
        $('#fleet-bar-maintenance').style.width = (maintenance / total * 100) + '%';
        $('#fleet-count-available').textContent = available;
        $('#fleet-count-rented').textContent = rented;
        $('#fleet-count-maintenance').textContent = maintenance;

        // Recent bookings
        const recent = bookings.slice(-5).reverse();
        const tbody = $('#dashboard-bookings-body');
        if (recent.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No bookings yet</td></tr>';
        } else {
            tbody.innerHTML = recent.map(b => `
                <tr>
                    <td>${b.customerName}</td>
                    <td>${b.carNumber}</td>
                    <td>${formatDate(b.startDate)} – ${formatDate(b.endDate)}</td>
                    <td class="amount">${formatCurrency(b.totalAmount)}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        showToast('Failed to load dashboard data', 'error');
    }
}

// ── Cars ──
async function loadCars() {
    try {
        carsData = await api('/cars');
        renderCarsTable();
    } catch (err) {
        showToast('Failed to load cars', 'error');
    }
}

function renderCarsTable() {
    const tbody = $('#cars-table-body');
    if (carsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No cars found. Add your first car!</td></tr>';
        return;
    }
    tbody.innerHTML = carsData.map(car => `
        <tr>
            <td><strong>${car.carNumber}</strong></td>
            <td>${car.capacity} seats</td>
            <td><span class="badge badge--${car.status}">${car.status}</span></td>
            <td class="amount">${formatCurrency(car.pricePerDay)}</td>
            <td>
                <div class="tag-list">
                    ${car.features.map(f => `<span class="tag">${f}</span>`).join('')}
                </div>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn btn--ghost btn--sm" onclick="openCarModal('${car.carNumber}')">Edit</button>
                    <button class="btn btn--danger btn--sm" onclick="deleteCar('${car.carNumber}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openCarModal(carNumber = null) {
    const isEdit = !!carNumber;
    const car = isEdit ? carsData.find(c => c.carNumber === carNumber) : null;

    const html = `
        <form id="car-form">
            <div class="form-group">
                <label class="form-label">Car Number</label>
                <input class="form-input" type="text" name="carNumber" placeholder="e.g. 51A-12345" 
                    value="${car ? car.carNumber : ''}" ${isEdit ? 'readonly style="opacity:0.6"' : ''} required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Capacity</label>
                    <input class="form-input" type="number" name="capacity" placeholder="e.g. 7" 
                        value="${car ? car.capacity : ''}" min="1" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Price Per Day</label>
                    <input class="form-input" type="number" name="pricePerDay" placeholder="e.g. 500000" 
                        value="${car ? car.pricePerDay : ''}" min="0" required>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Status</label>
                <select class="form-select" name="status">
                    <option value="available" ${car && car.status === 'available' ? 'selected' : ''}>Available</option>
                    <option value="rented" ${car && car.status === 'rented' ? 'selected' : ''}>Rented</option>
                    <option value="maintenance" ${car && car.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Features</label>
                <input class="form-input" type="text" name="features" placeholder="automatic, air-conditioner, GPS" 
                    value="${car ? car.features.join(', ') : ''}">
                <div class="form-hint">Separate features with commas</div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn--ghost" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn--primary">${isEdit ? 'Update Car' : 'Add Car'}</button>
            </div>
        </form>
    `;

    openModal(isEdit ? 'Edit Car' : 'Add New Car', html);

    $('#car-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const data = {
            carNumber: form.carNumber.value.trim(),
            capacity: parseInt(form.capacity.value),
            status: form.status.value,
            pricePerDay: parseFloat(form.pricePerDay.value),
            features: form.features.value.split(',').map(f => f.trim()).filter(Boolean)
        };

        try {
            if (isEdit) {
                await api(`/cars/${carNumber}`, { method: 'PUT', body: JSON.stringify(data) });
                showToast('Car updated successfully!');
            } else {
                await api('/cars', { method: 'POST', body: JSON.stringify(data) });
                showToast('Car added successfully!');
            }
            closeModal();
            loadCars();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

async function deleteCar(carNumber) {
    if (!confirm(`Delete car ${carNumber}? This cannot be undone.`)) return;
    try {
        await api(`/cars/${carNumber}`, { method: 'DELETE' });
        showToast('Car deleted successfully!');
        loadCars();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ── Bookings ──
async function loadBookings() {
    try {
        const [bookings, cars] = await Promise.all([
            api('/bookings'),
            api('/cars')
        ]);
        bookingsData = bookings;
        carsData = cars;
        renderBookingsTable();
    } catch (err) {
        showToast('Failed to load bookings', 'error');
    }
}

function renderBookingsTable() {
    const tbody = $('#bookings-table-body');
    if (bookingsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No bookings yet. Create your first booking!</td></tr>';
        return;
    }
    tbody.innerHTML = bookingsData.map(b => `
        <tr>
            <td><strong>${b.customerName}</strong></td>
            <td>${b.carNumber}</td>
            <td>${formatDate(b.startDate)}</td>
            <td>${formatDate(b.endDate)}</td>
            <td class="amount">${formatCurrency(b.totalAmount)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn--ghost btn--sm" onclick="openBookingModal('${b._id}')">Edit</button>
                    <button class="btn btn--danger btn--sm" onclick="deleteBooking('${b._id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openBookingModal(bookingId = null) {
    const isEdit = !!bookingId;
    const booking = isEdit ? bookingsData.find(b => b._id === bookingId) : null;

    const carOptions = carsData
        .filter(c => c.status !== 'maintenance' || (isEdit && c.carNumber === booking.carNumber))
        .map(c => `<option value="${c.carNumber}" ${booking && booking.carNumber === c.carNumber ? 'selected' : ''}>${c.carNumber} — ${formatCurrency(c.pricePerDay)}/day</option>`)
        .join('');

    const html = `
        <form id="booking-form">
            <div class="form-group">
                <label class="form-label">Customer Name</label>
                <input class="form-input" type="text" name="customerName" placeholder="e.g. Nguyen Van A" 
                    value="${booking ? booking.customerName : ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Car</label>
                <select class="form-select" name="carNumber" id="booking-car-select" required>
                    <option value="">Select a car...</option>
                    ${carOptions}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Start Date</label>
                    <input class="form-input" type="date" name="startDate" id="booking-start"
                        value="${booking ? formatDateInput(booking.startDate) : ''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">End Date</label>
                    <input class="form-input" type="date" name="endDate" id="booking-end"
                        value="${booking ? formatDateInput(booking.endDate) : ''}" required>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Estimated Total</label>
                <div class="form-input" id="booking-estimate" style="background: rgba(168, 85, 247, 0.08); border-color: rgba(168, 85, 247, 0.2); font-weight: 700; color: #a855f7;">
                    ${booking ? formatCurrency(booking.totalAmount) : 'Select car and dates to calculate'}
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn--ghost" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn--primary">${isEdit ? 'Update Booking' : 'Create Booking'}</button>
            </div>
        </form>
    `;

    openModal(isEdit ? 'Edit Booking' : 'New Booking', html);

    // Auto-calculate total
    const updateEstimate = () => {
        const carNum = $('#booking-car-select').value;
        const start = $('#booking-start').value;
        const end = $('#booking-end').value;
        const estimate = $('#booking-estimate');

        if (carNum && start && end) {
            const car = carsData.find(c => c.carNumber === carNum);
            if (car) {
                const days = Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
                if (days > 0) {
                    estimate.textContent = `${formatCurrency(days * car.pricePerDay)} (${days} day${days > 1 ? 's' : ''} × ${formatCurrency(car.pricePerDay)})`;
                    return;
                }
            }
        }
        estimate.textContent = 'Select car and dates to calculate';
    };

    $('#booking-car-select').addEventListener('change', updateEstimate);
    $('#booking-start').addEventListener('change', updateEstimate);
    $('#booking-end').addEventListener('change', updateEstimate);

    $('#booking-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const data = {
            customerName: form.customerName.value.trim(),
            carNumber: form.carNumber.value,
            startDate: form.startDate.value,
            endDate: form.endDate.value
        };

        try {
            if (isEdit) {
                await api(`/bookings/${bookingId}`, { method: 'PUT', body: JSON.stringify(data) });
                showToast('Booking updated successfully!');
            } else {
                await api('/bookings', { method: 'POST', body: JSON.stringify(data) });
                showToast('Booking created successfully!');
            }
            closeModal();
            loadBookings();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

async function deleteBooking(bookingId) {
    if (!confirm('Delete this booking? This cannot be undone.')) return;
    try {
        await api(`/bookings/${bookingId}`, { method: 'DELETE' });
        showToast('Booking deleted successfully!');
        loadBookings();
    } catch (err) {
        showToast(err.message, 'error');
    }
}
