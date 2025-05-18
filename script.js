// Initialize variables
let totalBudget = parseFloat(localStorage.getItem('totalBudget')) || 0;
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let categoryChart = null;
let dailyChart = null;
let budgetComparisonChart = null;
let savingsGoal = parseFloat(localStorage.getItem('savingsGoal')) || 0;
let customCategories = JSON.parse(localStorage.getItem('customCategories')) || [];

// Calendar functionality
let currentView = 'month';
let currentDate = new Date();
let trendsChart = null;

// Function to set the total budget
function setTotalBudget() {
    const budgetInput = document.getElementById('totalBudget');
    const budget = parseFloat(budgetInput.value);
    const addToExisting = document.getElementById('addToExisting').checked;
    
    if (isNaN(budget) || budget <= 0) {
        showAlert('Please enter a valid budget amount');
        return;
    }
    
    if (addToExisting) {
        totalBudget += budget;
    } else {
        totalBudget = budget;
    }
    
    localStorage.setItem('totalBudget', totalBudget);
    
    // Update displays immediately
    updateBudgetDisplay();
    budgetInput.value = '';
    showAlert('Budget updated successfully!', 'success');
}

// Function to add a new expense
function addExpense() {
    const name = document.getElementById('expenseName').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const date = document.getElementById('expenseDate').value;
    const notes = document.getElementById('expenseNotes').value;
    
    if (!name || isNaN(amount) || amount <= 0 || !date) {
        showAlert('Please fill in all required fields');
        return;
    }

    // Calculate current total spent
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Check if adding this expense would exceed the budget
    if (totalSpent + amount > totalBudget) {
        showAlert('Adding this expense would exceed your total budget!', 'error');
        return;
    }
    
    const expense = {
        id: Date.now(),
        name,
        amount,
        category,
        date,
        notes
    };
    
    expenses.push(expense);
    
    // Save to localStorage
    localStorage.setItem('expenses', JSON.stringify(expenses));
    
    // Update all displays immediately
    updateBudgetDisplay();
    updateExpensesList();
    updateCharts();
    checkBudgetAlerts();
    clearExpenseForm();
    
    // Show success message
    showAlert('Expense added successfully!', 'success');
}

// Function to delete an expense
function deleteExpense(id) {
    const expenseElement = document.querySelector(`[data-id="${id}"]`);
    if (expenseElement) {
        expenseElement.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        expenseElement.style.opacity = '0';
        expenseElement.style.transform = 'translateX(100px)';
        
        setTimeout(() => {
            expenses = expenses.filter(expense => expense.id !== id);
            localStorage.setItem('expenses', JSON.stringify(expenses));
            
            // Update all displays immediately
            updateBudgetDisplay();
            updateExpensesList();
            updateCharts();
            showAlert('Expense deleted successfully!', 'success');
        }, 500);
    }
}

// Function to update the expenses list in the table
function updateExpensesList() {
    const tbody = document.getElementById('expensesList');
    tbody.innerHTML = '';
    
    const filteredExpenses = filterExpenses();
    
    filteredExpenses.forEach((expense, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', expense.id);
        row.style.opacity = '0';
        row.style.transform = 'translateY(20px)';
        row.innerHTML = `
            <td>${formatDate(expense.date)}</td>
            <td>${expense.name}</td>
            <td>${formatCurrency(expense.amount)}</td>
            <td>${capitalizeFirst(expense.category)}</td>
            <td>${expense.notes || '-'}</td>
            <td>
                <button onclick="deleteExpense(${expense.id})" class="delete-btn">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
        
        // Animate row appearance
        setTimeout(() => {
            row.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Filter expenses
function filterExpenses() {
    const categoryFilter = document.getElementById('filterCategory').value;
    const dateFilter = document.getElementById('filterDate').value;
    
    const filteredExpenses = expenses.filter(expense => {
        const categoryMatch = categoryFilter === 'all' || expense.category === categoryFilter;
        const dateMatch = filterByDate(expense.date, dateFilter);
        return categoryMatch && dateMatch;
    });
    
    return filteredExpenses;
}

function applyFilters() {
    const filteredExpenses = filterExpenses();
    showExpenseSummary(filteredExpenses);
}

// Filter by date
function filterByDate(expenseDate, filter) {
    if (filter === 'all') return true;
    
    const date = new Date(expenseDate);
    const today = new Date();
    
    switch (filter) {
        case 'today':
            return date.toDateString() === today.toDateString();
        case 'week':
            const weekAgo = new Date(today.setDate(today.getDate() - 7));
            return date >= weekAgo;
        case 'month':
            const monthAgo = new Date(today.setMonth(today.getMonth() - 1));
            return date >= monthAgo;
        default:
            return true;
    }
}

// Function to update the budget display
function updateBudgetDisplay() {
    // Calculate total spent across all categories including custom categories
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const remaining = totalBudget - totalSpent;
    
    const currentTotalElement = document.getElementById('currentTotal');
    const remainingBudgetElement = document.getElementById('remainingBudget');
    
    if (currentTotalElement && remainingBudgetElement) {
        // Update current total
        currentTotalElement.textContent = formatCurrency(totalSpent);
        
        // Update remaining budget
        remainingBudgetElement.textContent = formatCurrency(remaining);
        
        // Update color based on remaining budget
        if (remaining < 0) {
            remainingBudgetElement.style.color = 'var(--danger)';
            showAlert('Warning: You have exceeded your budget!', 'warning');
        } else if (remaining < totalBudget * 0.2) {
            remainingBudgetElement.style.color = 'var(--warning)';
            showAlert('Warning: You are close to exceeding your budget!', 'warning');
        } else {
            remainingBudgetElement.style.color = 'var(--primary)';
        }
        
        // Update all related displays
        updateCategoryProgress();
        updateRecentExpenses();
        updateBudgetInsights();
        updateSavingsProgress();
    }
}

// Function to animate number changes
function animateNumber(element, target) {
    if (!element) return;
    
    const current = parseFloat(element.textContent.replace('₹', '').replace(/,/g, '')) || 0;
    const increment = (target - current) / 20;
    let currentValue = current;
    
    const animate = () => {
        currentValue += increment;
        if ((increment > 0 && currentValue >= target) || 
            (increment < 0 && currentValue <= target)) {
            element.textContent = formatCurrency(target);
        } else {
            element.textContent = formatCurrency(currentValue);
            requestAnimationFrame(animate);
        }
    };
    
    animate();
}

// Function to update charts
function updateCharts() {
    updateCategoryChart();
    updateDailyChart();
    updateBudgetComparisonChart();
    updateAnalyticsSummary();
}

// Update category chart
function updateCategoryChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    const categoryData = getCategoryData();
    
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    categoryChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categoryData.labels,
            datasets: [{
                data: categoryData.values,
                backgroundColor: [
                    '#FF6B35', // Sunset Orange
                    '#00BFFF', // Sky Blue
                    '#FFE156', // Lemon Yellow
                    '#00C49A', // Aqua Green
                    '#FF7F7F', // Coral Pink
                    '#2E2E2E'  // Charcoal
                ],
                borderWidth: 2,
                borderColor: '#FFFFFF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 20,
                        font: {
                            size: 12
                        },
                        color: '#2E2E2E'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            },
            layout: {
                padding: {
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 20
                }
            }
        }
    });
}

// Update daily chart
function updateDailyChart() {
    const ctx = document.getElementById('dailyChart').getContext('2d');
    const dailyData = getDailyData();
    
    if (dailyChart) {
        dailyChart.destroy();
    }
    
    dailyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dailyData.labels,
            datasets: [{
                label: 'Daily Expenses',
                data: dailyData.values,
                backgroundColor: '#00BFFF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Update budget comparison chart
function updateBudgetComparisonChart() {
    const ctx = document.getElementById('budgetComparisonChart').getContext('2d');
    const categoryData = getCategoryData();
    
    // Calculate budget allocation per category (assuming equal distribution)
    const budgetPerCategory = totalBudget / Object.keys(categoryData.labels).length;
    
    if (budgetComparisonChart) {
        budgetComparisonChart.destroy();
    }
    
    budgetComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categoryData.labels,
            datasets: [
                {
                    label: 'Budget',
                    data: Array(categoryData.labels.length).fill(budgetPerCategory),
                    backgroundColor: 'rgba(0, 191, 255, 0.5)',
                    borderColor: 'rgba(0, 191, 255, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Actual',
                    data: categoryData.values,
                    backgroundColor: 'rgba(255, 111, 53, 0.5)',
                    borderColor: 'rgba(255, 111, 53, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Amount (₹)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Categories'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
}

// Get category data for chart
function getCategoryData() {
    const categories = {};
    expenses.forEach(expense => {
        categories[expense.category] = (categories[expense.category] || 0) + expense.amount;
    });
    
    return {
        labels: Object.keys(categories).map(capitalizeFirst),
        values: Object.values(categories)
    };
}

// Get daily data for chart
function getDailyData() {
    const daily = {};
    expenses.forEach(expense => {
        daily[expense.date] = (daily[expense.date] || 0) + expense.amount;
    });
    
    return {
        labels: Object.keys(daily).map(formatDate),
        values: Object.values(daily)
    };
}

// Check budget alerts
function checkBudgetAlerts() {
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const percentage = (totalSpent / totalBudget) * 100;
    
    if (percentage >= 100) {
        showAlert('Budget exceeded!', 'error');
    } else if (percentage >= 90) {
        showAlert('Budget at 90%!', 'warning');
    } else if (percentage >= 80) {
        showAlert('Budget at 80%', 'info');
    }
}

// Show alert
function showAlert(message, type = 'error') {
    const alert = document.createElement('div');
    alert.className = `budget-alert ${type}`;
    alert.textContent = message;
    alert.style.opacity = '0';
    alert.style.transform = 'translateX(100px)';
    
    document.body.appendChild(alert);
    
    // Trigger animation
    setTimeout(() => {
        alert.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        alert.style.opacity = '1';
        alert.style.transform = 'translateX(0)';
    }, 50);
    
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(100px)';
        setTimeout(() => {
            alert.remove();
        }, 500);
    }, 3000);
}

// Function to export data
function exportData() {
    try {
        // Calculate totals
        const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const remaining = totalBudget - totalSpent;
        
        // Create the report content
        let reportContent = [
            "TripTally - Expense Report",
            "========================",
            `Generated on: ${new Date().toLocaleDateString()}`,
            "",
            "Budget Summary",
            "-------------",
            `Total Budget: ${formatCurrency(totalBudget)}`,
            `Total Spent: ${formatCurrency(totalSpent)}`,
            `Remaining Budget: ${formatCurrency(remaining)}`,
            "",
            "Category Breakdown",
            "-----------------"
        ];

        // Add category breakdown
        const categoryData = getCategoryData();
        Object.entries(categoryData).forEach(([category, amount]) => {
            reportContent.push(`${category}: ${formatCurrency(amount)}`);
        });

        // Add expense list
        reportContent.push(
            "",
            "Detailed Expense List",
            "-------------------",
            "Date\t\tName\t\tCategory\t\tAmount\t\tNotes"
        );

        // Add each expense
        expenses.forEach(expense => {
            reportContent.push(
                `${formatDate(expense.date)}\t${expense.name}\t${capitalizeFirst(expense.category)}\t${formatCurrency(expense.amount)}\t${expense.notes || "-"}`
            );
        });

        // Add budget insights
        const dailyAverage = expenses.length > 0 ? 
            totalSpent / new Set(expenses.map(expense => expense.date)).size : 0;
        
        reportContent.push(
            "",
            "Budget Insights",
            "--------------",
            `Daily Average: ${formatCurrency(dailyAverage)}`,
            `Most Expensive Day: ${getMostExpensiveDay()}`,
            `Top Category: ${getTopCategory()}`
        );

        // Create and download the file
        const blob = new Blob([reportContent.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TripTally-Report-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showAlert('Report exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showAlert('Error exporting data. Please try again.', 'error');
    }
}

// Helper function to get most expensive day
function getMostExpensiveDay() {
    const dailyTotals = {};
    expenses.forEach(expense => {
        dailyTotals[expense.date] = (dailyTotals[expense.date] || 0) + expense.amount;
    });
    
    const mostExpensiveDay = Object.entries(dailyTotals)
        .sort((a, b) => b[1] - a[1])[0];
    
    return mostExpensiveDay ? 
        `${formatDate(mostExpensiveDay[0])} (${formatCurrency(mostExpensiveDay[1])})` : 
        'No expenses recorded';
}

// Helper function to get top category
function getTopCategory() {
    const categoryTotals = {};
    expenses.forEach(expense => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });
    
    const topCategory = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])[0];
    
    return topCategory ? 
        `${capitalizeFirst(topCategory[0])} (${formatCurrency(topCategory[1])})` : 
        'No expenses recorded';
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function clearExpenseForm() {
    document.getElementById('expenseName').value = '';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseCategory').value = 'food';
    document.getElementById('expenseDate').value = '';
    document.getElementById('expenseNotes').value = '';
}

// Initialize date input with today's date
document.getElementById('expenseDate').valueAsDate = new Date();

// Add event listeners for Enter key
document.getElementById('totalBudget').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        setTotalBudget();
    }
});

document.getElementById('expenseAmount').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addExpense();
    }
});

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
    }
    
    .notification.success {
        background: linear-gradient(45deg, #2ecc71, #27ae60);
    }
    
    .notification.error {
        background: linear-gradient(45deg, #e74c3c, #c0392b);
    }
    
    .notification.warning {
        background: linear-gradient(45deg, #f39c12, #d35400);
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(20px);
        }
    }

    /* Dark theme specific styles for expenses table */
    [data-theme="dark"] #expensesList td {
        color: #000000 !important;
    }

    [data-theme="dark"] #expensesList th {
        color: #000000 !important;
    }
`;
document.head.appendChild(style);

// Navigation
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = link.getAttribute('data-page');
            
            // Update active states
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Show target page with animation
            showPage(targetPage);
        });
    });
}

// Function to handle page transitions with animations
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(pageId).classList.add('active');
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
    
    // Close mobile menu if open
    const navLinks = document.querySelector('.nav-links');
    if (navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
    }
}

// Initialize calendar
function initCalendar() {
    const viewButtons = document.querySelectorAll('.view-btn');
    const prevBtn = document.getElementById('prevPeriod');
    const nextBtn = document.getElementById('nextPeriod');
    
    // Set initial view to month
    currentView = 'month';
    document.querySelector('.view-btn[data-view="month"]').classList.add('active');
    
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            updateCalendar();
        });
    });
    
    prevBtn.addEventListener('click', () => {
        if (currentView === 'month') {
            currentDate.setMonth(currentDate.getMonth() - 1);
        } else {
            currentDate.setFullYear(currentDate.getFullYear() - 1);
        }
        updateCalendar();
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentView === 'month') {
            currentDate.setMonth(currentDate.getMonth() + 1);
        } else {
            currentDate.setFullYear(currentDate.getFullYear() + 1);
        }
        updateCalendar();
    });
    
    // Initialize with month view
    updateCalendar();
}

function updateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const periodTitle = document.getElementById('currentPeriod');
    
    if (!calendarGrid || !periodTitle) {
        console.error('Calendar elements not found');
        return;
    }
    
    // Clear existing content and classes
    calendarGrid.innerHTML = '';
    calendarGrid.className = 'calendar-grid';
    
    if (currentView === 'month') {
        updateMonthView();
        periodTitle.textContent = currentDate.toLocaleString('default', { 
            month: 'long', 
            year: 'numeric' 
        });
    } else {
        calendarGrid.classList.add('year-view');
        updateYearView();
        periodTitle.textContent = currentDate.getFullYear().toString();
    }
    
    updateExpenseSummary();
    updateTrendsChart();
}

function updateMonthView() {
    const calendarGrid = document.getElementById('calendarGrid');
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Add day headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Add empty cells for days before first of month
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayExpenses = getFilteredExpenses(dateStr);
        
        if (dayExpenses.length > 0) {
            dayElement.classList.add('has-expenses');
            const total = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            dayElement.title = `${dayExpenses.length} expenses (${formatCurrency(total)})`;
        }
        
        dayElement.addEventListener('click', () => showDayExpenses(dateStr));
        calendarGrid.appendChild(dayElement);
    }
}

function updateYearView() {
    const calendarGrid = document.getElementById('calendarGrid');
    const year = currentDate.getFullYear();
    
    for (let month = 0; month < 12; month++) {
        const monthElement = document.createElement('div');
        monthElement.className = 'year-month';
        
        const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'short' });
        monthElement.innerHTML = `
            <h4>${monthName}</h4>
            <div class="month-days"></div>
        `;
        
        const daysContainer = monthElement.querySelector('.month-days');
        
        // Add day headers
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        days.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = day;
            daysContainer.appendChild(dayHeader);
        });
        
        // Add days
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        
        // Add empty cells for days before first of month
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'day empty';
            daysContainer.appendChild(emptyDay);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'day';
            dayElement.textContent = day;
            
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayExpenses = getFilteredExpenses(dateStr);
            
            if (dayExpenses.length > 0) {
                dayElement.classList.add('has-expenses');
            }
            
            dayElement.addEventListener('click', () => {
                currentView = 'month';
                currentDate = new Date(year, month, day);
                document.querySelector('.view-btn[data-view="month"]').classList.add('active');
                document.querySelector('.view-btn[data-view="year"]').classList.remove('active');
                updateCalendar();
            });
            
            daysContainer.appendChild(dayElement);
        }
        
        calendarGrid.appendChild(monthElement);
    }
}

function getFilteredExpenses(date) {
    return expenses.filter(expense => expense.date === date);
}

function updateExpenseSummary() {
    // Calculate summary statistics for all expenses
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const days = new Set(expenses.map(exp => exp.date)).size;
    const average = days > 0 ? total / days : 0;
    
    // Calculate daily totals
    const dailyTotals = {};
    expenses.forEach(expense => {
        dailyTotals[expense.date] = (dailyTotals[expense.date] || 0) + expense.amount;
    });
    
    // Find most expensive day
    const mostExpensiveDay = Object.entries(dailyTotals)
        .sort((a, b) => b[1] - a[1])[0];
    
    // Update the summary display
    document.getElementById('periodTotal').textContent = formatCurrency(total);
    document.getElementById('periodAverage').textContent = formatCurrency(average);
    document.getElementById('periodMostExpensive').textContent = 
        mostExpensiveDay ? 
        `${formatDate(mostExpensiveDay[0])} (${formatCurrency(mostExpensiveDay[1])})` : 
        '-';

    // Update the trends chart
    updateTrendsChart();
}

function updateTrendsChart() {
    const ctx = document.getElementById('trendsChart').getContext('2d');
    
    // Group expenses by date
    const dailyData = {};
    expenses.forEach(expense => {
        dailyData[expense.date] = (dailyData[expense.date] || 0) + expense.amount;
    });
    
    // Sort dates
    const sortedDates = Object.keys(dailyData).sort();
    
    if (trendsChart) {
        trendsChart.destroy();
    }
    
    trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates.map(formatDate),
            datasets: [{
                label: 'Daily Expenses',
                data: sortedDates.map(date => dailyData[date]),
                borderColor: '#4A90E2',
                backgroundColor: 'rgba(74, 144, 226, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function showDayExpenses(date) {
    // Get expenses for the selected day
    const dayExpenses = expenses.filter(expense => expense.date === date);
    
    // Create popup container
    const popup = document.createElement('div');
    popup.className = 'expense-popup';
    
    // Create popup content
    const total = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    popup.innerHTML = `
        <div class="expense-popup-content">
            <div class="popup-header">
                <h3>Expenses for ${formatDate(date)}</h3>
                <button class="close-popup">&times;</button>
            </div>
            <div class="popup-body">
                <div class="daily-summary">
                    <div class="summary-item">
                        <span>Total Expenses:</span>
                        <span class="amount">${formatCurrency(total)}</span>
                    </div>
                    <div class="summary-item">
                        <span>Number of Expenses:</span>
                        <span class="count">${dayExpenses.length}</span>
                    </div>
                </div>
                ${dayExpenses.length > 0 ? `
                    <div class="expense-list">
                        ${dayExpenses.map(expense => `
                            <div class="expense-item">
                                <div class="expense-header">
                                    <span class="expense-name">${expense.name}</span>
                                    <span class="expense-amount">${formatCurrency(expense.amount)}</span>
                                </div>
                                <div class="expense-details">
                                    <span class="expense-category">
                                        <i class="fas fa-tag"></i> ${capitalizeFirst(expense.category)}
                                    </span>
                                    ${expense.notes ? `
                                        <span class="expense-notes">
                                            <i class="fas fa-sticky-note"></i> ${expense.notes}
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="no-expenses">
                        <i class="fas fa-calendar-check"></i>
                        <p>No expenses recorded for this day</p>
                    </div>
                `}
            </div>
        </div>
    `;
    
    // Add popup to document
    document.body.appendChild(popup);
    
    // Add overlay
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    document.body.appendChild(overlay);
    
    // Show popup and overlay with animation
    requestAnimationFrame(() => {
        popup.classList.add('active');
        overlay.classList.add('active');
    });
    
    // Close popup when clicking close button or overlay
    const closePopup = () => {
        popup.classList.remove('active');
        overlay.classList.remove('active');
        setTimeout(() => {
            popup.remove();
            overlay.remove();
        }, 300);
    };
    
    popup.querySelector('.close-popup').addEventListener('click', closePopup);
    overlay.addEventListener('click', closePopup);
}

// Add CSS for the popup
const popupStyle = document.createElement('style');
popupStyle.textContent = `
    .expense-popup {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.9);
        background: var(--background);
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 1000;
    }
    
    .expense-popup.active {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }
    
    .expense-popup-content {
        padding: 20px;
        max-height: 80vh;
        overflow-y: auto;
    }
    
    .popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--border);
    }
    
    .popup-header h3 {
        margin: 0;
        color: var(--text);
    }
    
    .close-popup {
        background: none;
        border: none;
        font-size: 24px;
        color: var(--text);
        cursor: pointer;
        padding: 0;
        line-height: 1;
    }
    
    .daily-summary {
        background: var(--card-background);
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
    }
    
    .summary-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
    }
    
    .summary-item:last-child {
        margin-bottom: 0;
    }
    
    .expense-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .expense-item {
        background: var(--card-background);
        padding: 15px;
        border-radius: 8px;
        transition: transform 0.2s ease;
    }
    
    .expense-item:hover {
        transform: translateX(5px);
    }
    
    .expense-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    
    .expense-name {
        font-weight: 600;
        color: var(--text);
    }
    
    .expense-amount {
        font-weight: 600;
        color: var(--primary);
    }
    
    .expense-details {
        display: flex;
        flex-direction: column;
        gap: 5px;
        font-size: 0.9em;
        color: var(--text-secondary);
    }
    
    .expense-category, .expense-notes {
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    .no-expenses {
        text-align: center;
        padding: 30px;
        color: var(--text-secondary);
    }
    
    .no-expenses i {
        font-size: 48px;
        margin-bottom: 10px;
        color: var(--primary);
    }
    
    .popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 999;
    }
    
    .popup-overlay.active {
        opacity: 1;
    }
`;
document.head.appendChild(popupStyle);

// Settings
function initSettings() {
    const budgetInput = document.getElementById('budget');
    const warningThreshold = document.getElementById('warning-threshold');
    const criticalThreshold = document.getElementById('critical-threshold');
    const importBtn = document.querySelector('.import-btn');
    
    // Load saved settings
    const savedSettings = JSON.parse(localStorage.getItem('budgetSettings')) || {
        warningThreshold: 80,
        criticalThreshold: 90
    };
    
    warningThreshold.value = savedSettings.warningThreshold;
    criticalThreshold.value = savedSettings.criticalThreshold;
    
    // Save settings on change
    [warningThreshold, criticalThreshold].forEach(input => {
        input.addEventListener('change', () => {
            const settings = {
                warningThreshold: parseInt(warningThreshold.value),
                criticalThreshold: parseInt(criticalThreshold.value)
            };
            localStorage.setItem('budgetSettings', JSON.stringify(settings));
        });
    });
    
    // Import data
    importBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    
                    if (importedData.expenses) {
                        expenses = importedData.expenses;
                        updateExpensesList();
                        updateBudgetDisplay();
                        updateCharts();
                        showAlert('Data imported successfully!', 'success');
                    }
                } catch (error) {
                    showAlert('Error importing data. Please check the file format.', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    });
}

// Function to format currency
function formatCurrency(amount) {
    return `₹${amount.toLocaleString('en-IN', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
    })}`;
}

// Initialize all functionality
document.addEventListener('DOMContentLoaded', () => {
    // Load saved data
    const savedBudget = localStorage.getItem('totalBudget');
    if (savedBudget) {
        totalBudget = parseFloat(savedBudget);
        document.getElementById('totalBudget').value = totalBudget;
    }
    
    // Load saved expenses
    const savedExpenses = localStorage.getItem('expenses');
    if (savedExpenses) {
        expenses = JSON.parse(savedExpenses);
    }
    
    // Initialize all displays
    updateBudgetDisplay();
    updateExpensesList();
    updateCharts();
    
    // Initialize other components
    initNavigation();
    initCalendar();
    initSettings();
    
    // Add event listeners
    const categorySelect = document.getElementById('expenseCategory');
    if (categorySelect) {
        categorySelect.addEventListener('change', handleCategorySelect);
    }
    
    // Initialize custom categories
    updateCategorySelect();
    updateCustomCategoriesList();
});

// Function to update category progress bars
function updateCategoryProgress() {
    // Get all unique categories including custom ones
    const allCategories = [...new Set(expenses.map(expense => expense.category))];
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Update each category's progress
    allCategories.forEach(category => {
        const categoryTotal = expenses
            .filter(expense => expense.category === category)
            .reduce((sum, expense) => sum + expense.amount, 0);
        
        // Update the progress bar if it exists
        const progressBar = document.getElementById(`${category}Progress`);
        if (progressBar) {
            const percentage = totalBudget > 0 ? (categoryTotal / totalBudget) * 100 : 0;
            progressBar.style.width = `${Math.min(percentage, 100)}%`;
        }
        
        // Update the category total display if it exists
        const totalElement = document.getElementById(`${category}Total`);
        if (totalElement) {
            totalElement.textContent = formatCurrency(categoryTotal);
        }
    });
}

// Function to update recent expenses
function updateRecentExpenses() {
    const recentList = document.getElementById('recentExpensesList');
    if (!recentList) return;
    
    const recentExpenses = [...expenses]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    recentList.innerHTML = recentExpenses.length ? recentExpenses.map(expense => `
        <div class="recent-item">
            <div class="expense-info">
                <h4>${expense.name}</h4>
                <p>${formatDate(expense.date)}</p>
            </div>
            <div class="expense-amount">
                <span>${formatCurrency(expense.amount)}</span>
                <small>${capitalizeFirst(expense.category)}</small>
            </div>
        </div>
    `).join('') : '<p>No recent expenses</p>';
}

// Function to update budget insights
function updateBudgetInsights() {
    if (expenses.length === 0) {
        document.getElementById('dailyAverage').textContent = formatCurrency(0);
        document.getElementById('mostExpensiveDay').textContent = '-';
        document.getElementById('topCategory').textContent = '-';
        return;
    }
    
    // Calculate daily average
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const days = new Set(expenses.map(expense => expense.date)).size;
    const dailyAverage = totalSpent / days;
    document.getElementById('dailyAverage').textContent = formatCurrency(dailyAverage);
    
    // Find most expensive day
    const dailyTotals = {};
    expenses.forEach(expense => {
        dailyTotals[expense.date] = (dailyTotals[expense.date] || 0) + expense.amount;
    });
    
    const mostExpensiveDay = Object.entries(dailyTotals)
        .sort((a, b) => b[1] - a[1])[0];
    
    document.getElementById('mostExpensiveDay').textContent = 
        `${formatDate(mostExpensiveDay[0])} (${formatCurrency(mostExpensiveDay[1])})`;
    
    // Find top category
    const categoryTotals = {};
    expenses.forEach(expense => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });
    
    const topCategory = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])[0];
    
    document.getElementById('topCategory').textContent = 
        `${capitalizeFirst(topCategory[0])} (${formatCurrency(topCategory[1])})`;
}

// Function to set savings goal
function setSavingsGoal() {
    const goalInput = document.getElementById('savingsGoal');
    const goal = parseFloat(goalInput.value);
    
    if (isNaN(goal) || goal <= 0) {
        showAlert('Please enter a valid savings goal');
        return;
    }
    
    savingsGoal = goal;
    updateSavingsProgress();
    goalInput.value = '';
    showAlert('Savings goal set successfully!', 'success');
}

// Function to update savings progress
function updateSavingsProgress() {
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const saved = totalBudget - totalSpent;
    const progressBar = document.getElementById('savingsProgress');
    const statusElement = document.getElementById('savingsStatus');
    
    if (savingsGoal > 0) {
        const percentage = (saved / savingsGoal) * 100;
        progressBar.style.width = `${Math.min(percentage, 100)}%`;
        
        if (saved >= savingsGoal) {
            statusElement.textContent = `Goal achieved! Saved ${formatCurrency(saved)}`;
            statusElement.style.color = 'var(--success)';
        } else {
            statusElement.textContent = `Saved ${formatCurrency(saved)} of ${formatCurrency(savingsGoal)}`;
            statusElement.style.color = 'var(--text)';
        }
    } else {
        progressBar.style.width = '0%';
        statusElement.textContent = 'No savings goal set';
        statusElement.style.color = 'var(--text)';
    }
}

// Function to handle custom category selection
function handleCategorySelect() {
    const categorySelect = document.getElementById('expenseCategory');
    const customInput = document.getElementById('customCategoryInput');
    
    if (categorySelect.value === 'custom') {
        customInput.style.display = 'flex';
    } else {
        customInput.style.display = 'none';
    }
}

// Function to add a new custom category
function addCustomCategory() {
    const newCategoryInput = document.getElementById('newCategory');
    const categoryName = newCategoryInput.value.trim();
    
    if (!categoryName) {
        showAlert('Please enter a category name', 'error');
        return;
    }
    
    // Check if category already exists
    if (customCategories.includes(categoryName)) {
        showAlert('This category already exists', 'error');
        return;
    }
    
    // Add to custom categories
    customCategories.push(categoryName);
    localStorage.setItem('customCategories', JSON.stringify(customCategories));
    
    // Update category select
    updateCategorySelect();
    
    // Clear input and hide custom input
    newCategoryInput.value = '';
    document.getElementById('customCategoryInput').style.display = 'none';
    
    // Select the new category
    document.getElementById('expenseCategory').value = categoryName;
    
    showAlert('Category added successfully!', 'success');
    updateCustomCategoriesList();
}

// Function to update category select options
function updateCategorySelect() {
    const categorySelect = document.getElementById('expenseCategory');
    const currentValue = categorySelect.value;
    
    // Keep the first 6 default options and the custom option
    const defaultOptions = Array.from(categorySelect.options).slice(0, 6);
    
    // Clear the select
    categorySelect.innerHTML = '';
    
    // Add default options back
    defaultOptions.forEach(option => {
        categorySelect.appendChild(option);
    });
    
    // Add custom categories
    customCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
    
    // Restore selected value if it still exists
    if (categorySelect.querySelector(`option[value="${currentValue}"]`)) {
        categorySelect.value = currentValue;
    }
}

// Function to delete a custom category
function deleteCustomCategory(category) {
    if (confirm(`Are you sure you want to delete the category "${category}"?`)) {
        customCategories = customCategories.filter(c => c !== category);
        localStorage.setItem('customCategories', JSON.stringify(customCategories));
        
        // Update UI
        updateCategorySelect();
        updateCustomCategoriesList();
        showAlert('Category deleted successfully!', 'success');
    }
}

// Function to update custom categories list in settings
function updateCustomCategoriesList() {
    const categoriesList = document.getElementById('customCategoriesList');
    if (!categoriesList) return;
    
    categoriesList.innerHTML = customCategories.map(category => `
        <div class="category-item">
            <span class="category-name">${category}</span>
            <div class="category-actions">
                <button onclick="deleteCustomCategory('${category}')" class="delete-category">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Add event listener for category select
document.addEventListener('DOMContentLoaded', () => {
    const categorySelect = document.getElementById('expenseCategory');
    if (categorySelect) {
        categorySelect.addEventListener('change', handleCategorySelect);
    }
    
    // Initialize custom categories
    updateCategorySelect();
    updateCustomCategoriesList();
});

// Function to update analytics summary
function updateAnalyticsSummary() {
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const days = new Set(expenses.map(expense => expense.date)).size;
    const dailyAverage = days > 0 ? totalSpent / days : 0;
    
    // Update total spent
    document.getElementById('analyticsTotalSpent').textContent = formatCurrency(totalSpent);
    
    // Update daily average
    document.getElementById('analyticsDailyAverage').textContent = formatCurrency(dailyAverage);
    
    // Update top category
    const categoryTotals = {};
    expenses.forEach(expense => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });
    
    const topCategory = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])[0];
    
    document.getElementById('analyticsTopCategory').textContent = 
        topCategory ? `${capitalizeFirst(topCategory[0])} (${formatCurrency(topCategory[1])})` : '-';
    
    // Update budget utilization
    const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    document.getElementById('analyticsBudgetUtilization').textContent = 
        `${utilization.toFixed(1)}%`;
}

function showExpenseSummary(filteredExpenses) {
    // Remove any existing popup and overlay
    const existingPopup = document.querySelector('.expense-summary');
    const existingOverlay = document.querySelector('.popup-overlay');
    if (existingPopup) existingPopup.remove();
    if (existingOverlay) existingOverlay.remove();

    const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const days = new Set(filteredExpenses.map(exp => exp.date)).size;
    const average = days > 0 ? total / days : 0;
    
    const dailyTotals = {};
    filteredExpenses.forEach(expense => {
        dailyTotals[expense.date] = (dailyTotals[expense.date] || 0) + expense.amount;
    });
    
    const mostExpensiveDay = Object.entries(dailyTotals)
        .sort((a, b) => b[1] - a[1])[0];

    // Create new popup
    const summaryPopup = document.createElement('div');
    summaryPopup.className = 'expense-summary';
    summaryPopup.innerHTML = `
        <div class="expense-summary-header">
            <h3>Expense Summary</h3>
            <button class="close-summary">&times;</button>
        </div>
        <div class="expense-list">
            <div class="expense-item">
                <span class="expense-category">Total Expenses</span>
                <span class="expense-amount">${formatCurrency(total)}</span>
            </div>
            <div class="expense-item">
                <span class="expense-category">Average per Day</span>
                <span class="expense-amount">${formatCurrency(average)}</span>
            </div>
            <div class="expense-item">
                <span class="expense-category">Most Expensive Day</span>
                <span class="expense-amount">${mostExpensiveDay ? 
                    `${formatDate(mostExpensiveDay[0])} (${formatCurrency(mostExpensiveDay[1])})` : 
                    '-'}</span>
            </div>
        </div>
    `;

    // Create new overlay
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

    // Add to document
    document.body.appendChild(overlay);
    document.body.appendChild(summaryPopup);

    // Show popup and overlay
    requestAnimationFrame(() => {
        summaryPopup.classList.add('active');
        overlay.classList.add('active');
    });

    // Add close button functionality
    const closeBtn = summaryPopup.querySelector('.close-summary');
    closeBtn.addEventListener('click', () => {
        summaryPopup.classList.remove('active');
        overlay.classList.remove('active');
        setTimeout(() => {
            summaryPopup.remove();
            overlay.remove();
        }, 300);
    });

    // Close on overlay click
    overlay.addEventListener('click', () => {
        summaryPopup.classList.remove('active');
        overlay.classList.remove('active');
        setTimeout(() => {
            summaryPopup.remove();
            overlay.remove();
        }, 300);
    });
}

// Theme Management
function changeTheme() {
    const theme = document.getElementById('themeSelect').value;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

function updateAccentColor() {
    const color = document.getElementById('accentColor').value;
    document.documentElement.style.setProperty('--primary-color', color);
    localStorage.setItem('accentColor', color);
}

function resetAccentColor() {
    const defaultColor = '#4A90E2';
    document.getElementById('accentColor').value = defaultColor;
    document.documentElement.style.setProperty('--primary-color', defaultColor);
    localStorage.setItem('accentColor', defaultColor);
}

// Currency and Date Format
function updateCurrency() {
    const currency = document.getElementById('currencySelect').value;
    localStorage.setItem('currency', currency);
    updateAllCurrencyDisplays();
}

function updateDateFormat() {
    const format = document.getElementById('dateFormatSelect').value;
    localStorage.setItem('dateFormat', format);
    updateAllDateDisplays();
}

// Notification Settings
function toggleNotification(type) {
    const enabled = document.getElementById(`${type}Toggle`).checked;
    localStorage.setItem(`${type}Enabled`, enabled);
}

// Data Management
function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        // Clear all data first
        localStorage.clear();
        
        // Reload the page
        location.reload();
    }
}

// Initialize user name
function initializeUserName() {
    const userName = localStorage.getItem('userName');
    const userNameElement = document.getElementById('userName');
    
    if (!userName) {
        // Wait for the dashboard animation to complete (3.5s for the last fade-in element)
        setTimeout(() => {
            // Show the clear data popup
            const popup = document.getElementById('clearDataPopup');
            const overlay = document.createElement('div');
            overlay.className = 'popup-overlay';
            
            document.body.appendChild(overlay);
            popup.classList.add('active');
            overlay.classList.add('active');
        }, 3500); // Wait for the last fade-in animation (fade-in-15) to complete
    } else {
        userNameElement.textContent = userName;
    }
}

function closeClearDataPopup() {
    const popup = document.getElementById('clearDataPopup');
    const overlay = document.querySelector('.popup-overlay');
    
    popup.classList.remove('active');
    overlay.classList.remove('active');
    setTimeout(() => {
        overlay.remove();
    }, 300);
}

function confirmClearData() {
    const name = document.getElementById('clearDataName').value.trim();
    const theme = document.getElementById('clearDataTheme').value;
    
    if (!name) {
        showNotification('Please enter your name', 'error');
        return;
    }
    
    if (!theme) {
        showNotification('Please select a theme', 'error');
        return;
    }
    
    // Save the new user data
    localStorage.setItem('userName', name);
    document.getElementById('userName').textContent = name;
    
    // Set the theme
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    document.getElementById('themeSelect').value = theme;
    
    // Close the popup
    closeClearDataPopup();
    
    // Navigate to dashboard with animation
    const navLink = document.querySelector('.nav-link[data-page="dashboard"]');
    if (navLink) {
        navLink.click();
    }
}

function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default? This will not delete your expense data.')) {
        // Save current trip details
        const savedExpenses = JSON.parse(localStorage.getItem('expenses')) || [];
        const savedBudget = localStorage.getItem('totalBudget');
        const savedSavingsGoal = localStorage.getItem('savingsGoal');

        // Reset theme
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeSelect').value = 'dark';
        
        // Reset accent color
        resetAccentColor();
        
        // Reset currency
        document.getElementById('currencySelect').value = 'INR';
        localStorage.setItem('currency', 'INR');
        
        // Reset date format
        document.getElementById('dateFormatSelect').value = 'DD/MM/YYYY';
        localStorage.setItem('dateFormat', 'DD/MM/YYYY');
        
        // Reset notifications
        document.getElementById('budgetAlertsToggle').checked = true;
        
        // Restore saved trip details
        localStorage.setItem('expenses', JSON.stringify(savedExpenses));
        localStorage.setItem('totalBudget', savedBudget);
        localStorage.setItem('savingsGoal', savedSavingsGoal);
        
        // Update displays
        updateAllCurrencyDisplays();
        updateAllDateDisplays();
        
        showNotification('Settings reset to default values!');
    }
}

// Initialize Settings
function initializeSettings() {
    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('themeSelect').value = savedTheme;
    
    // Load accent color
    const savedColor = localStorage.getItem('accentColor') || '#4A90E2';
    document.getElementById('accentColor').value = savedColor;
    document.documentElement.style.setProperty('--primary-color', savedColor);
    
    // Load currency
    const savedCurrency = localStorage.getItem('currency') || 'INR';
    document.getElementById('currencySelect').value = savedCurrency;
    
    // Load date format
    const savedDateFormat = localStorage.getItem('dateFormat') || 'DD/MM/YYYY';
    document.getElementById('dateFormatSelect').value = savedDateFormat;
    
    // Load notification settings
    document.getElementById('budgetAlertsToggle').checked = localStorage.getItem('budgetAlertsEnabled') !== 'false';
}

// Helper function to show notifications
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add event listeners when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeSettings();
    
    // Add event listener for budget alerts toggle
    document.getElementById('budgetAlertsToggle').addEventListener('change', () => toggleNotification('budgetAlerts'));
});

// Call initializeUserName when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeUserName();
    // ... existing initialization code ...
});

// Mobile menu toggle function
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
} 