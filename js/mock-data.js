// Test Mock Data for Reports
// This will allow us to test the frontend without database

// Mock API responses for different report types
const MOCK_SALES_DATA = {
    daily: {
        success: true,
        data: {
            sales: [
                {
                    sale_id: 101,
                    sale_date: '2025-08-01',
                    sale_time: '10:30:00',
                    customer_name: 'John Silva',
                    cashier_name: 'pharmacist1',
                    sub_total: 250.00,
                    discount: 25,
                    total_amount: 225.00,
                    payment_type: 'cash',
                    formatted_total: 'Rs. 225.00',
                    formatted_subtotal: 'Rs. 250.00'
                },
                {
                    sale_id: 102,
                    sale_date: '2025-08-01',
                    sale_time: '14:15:00',
                    customer_name: null,
                    cashier_name: 'pharmacist2',
                    sub_total: 180.50,
                    discount: 0,
                    total_amount: 180.50,
                    payment_type: 'card',
                    formatted_total: 'Rs. 180.50',
                    formatted_subtotal: 'Rs. 180.50'
                }
            ],
            summary: {
                total_transactions: 8,
                total_sales: 2150.75,
                total_discounts: 45.50,
                average_sale: 268.84,
                formatted_total_sales: 'Rs. 2,150.75',
                formatted_average_sale: 'Rs. 268.84',
                formatted_total_discounts: 'Rs. 45.50'
            }
        }
    },
    weekly: {
        success: true,
        data: {
            sales: [
                {
                    sale_id: 95,
                    sale_date: '2025-07-30',
                    sale_time: '09:15:00',
                    customer_name: 'Mary Fernando',
                    cashier_name: 'pharmacist1',
                    sub_total: 320.00,
                    discount: 32,
                    total_amount: 288.00,
                    payment_type: 'cash',
                    formatted_total: 'Rs. 288.00',
                    formatted_subtotal: 'Rs. 320.00'
                },
                {
                    sale_id: 96,
                    sale_date: '2025-07-31',
                    sale_time: '11:45:00',
                    customer_name: 'David Perera',
                    cashier_name: 'pharmacist2',
                    sub_total: 195.50,
                    discount: 0,
                    total_amount: 195.50,
                    payment_type: 'card',
                    formatted_total: 'Rs. 195.50',
                    formatted_subtotal: 'Rs. 195.50'
                }
            ],
            summary: {
                total_transactions: 42,
                total_sales: 15250.75,
                total_discounts: 285.50,
                average_sale: 363.11,
                formatted_total_sales: 'Rs. 15,250.75',
                formatted_average_sale: 'Rs. 363.11',
                formatted_total_discounts: 'Rs. 285.50'
            }
        }
    },
    monthly: {
        success: true,
        data: {
            sales: [
                {
                    sale_id: 1,
                    sale_date: '2025-07-15',
                    sale_time: '10:30:00',
                    customer_name: 'John Silva',
                    cashier_name: 'pharmacist1',
                    sub_total: 250.00,
                    discount: 25,
                    total_amount: 225.00,
                    payment_type: 'cash',
                    formatted_total: 'Rs. 225.00',
                    formatted_subtotal: 'Rs. 250.00'
                },
                {
                    sale_id: 2,
                    sale_date: '2025-07-20',
                    sale_time: '11:15:00',
                    customer_name: 'Sarah Mendis',
                    cashier_name: 'pharmacist2',
                    sub_total: 180.50,
                    discount: 0,
                    total_amount: 180.50,
                    payment_type: 'card',
                    formatted_total: 'Rs. 180.50',
                    formatted_subtotal: 'Rs. 180.50'
                }
            ],
            summary: {
                total_transactions: 156,
                total_sales: 65250.75,
                total_discounts: 1285.50,
                average_sale: 418.27,
                formatted_total_sales: 'Rs. 65,250.75',
                formatted_average_sale: 'Rs. 418.27',
                formatted_total_discounts: 'Rs. 1,285.50'
            }
        }
    },
    yearly: {
        success: true,
        data: {
            sales: [
                {
                    sale_id: 1,
                    sale_date: '2025-01-15',
                    sale_time: '10:30:00',
                    customer_name: 'John Silva',
                    cashier_name: 'pharmacist1',
                    sub_total: 250.00,
                    discount: 25,
                    total_amount: 225.00,
                    payment_type: 'cash',
                    formatted_total: 'Rs. 225.00',
                    formatted_subtotal: 'Rs. 250.00'
                },
                {
                    sale_id: 2,
                    sale_date: '2025-03-20',
                    sale_time: '11:15:00',
                    customer_name: 'Sarah Mendis',
                    cashier_name: 'pharmacist2',
                    sub_total: 180.50,
                    discount: 0,
                    total_amount: 180.50,
                    payment_type: 'card',
                    formatted_total: 'Rs. 180.50',
                    formatted_subtotal: 'Rs. 180.50'
                }
            ],
            summary: {
                total_transactions: 1247,
                total_sales: 755250.75,
                total_discounts: 15285.50,
                average_sale: 605.62,
                formatted_total_sales: 'Rs. 7,55,250.75',
                formatted_average_sale: 'Rs. 605.62',
                formatted_total_discounts: 'Rs. 15,285.50'
            }
        }
    }
};

const MOCK_INVENTORY_DATA = {
    success: true,
    data: {
        medicines: [
            {
                medicine_id: 1,
                medicine_name: 'Paracetamol 500mg',
                medicine_brand: 'GSK',
                stock_left: 150,
                medicine_price: 45.00,
                med_group_name: 'Pain Relief',
                stock_status: 'good_stock',
                formatted_price: 'Rs. 45.00'
            },
            {
                medicine_id: 2,
                medicine_name: 'Aspirin 75mg',
                medicine_brand: 'Bayer',
                stock_left: 0,
                medicine_price: 35.25,
                med_group_name: 'Pain Relief',
                stock_status: 'out_of_stock',
                formatted_price: 'Rs. 35.25'
            },
            {
                medicine_id: 3,
                medicine_name: 'Amoxicillin 500mg',
                medicine_brand: 'Cipla',
                stock_left: 8,
                medicine_price: 180.75,
                med_group_name: 'Antibiotics',
                stock_status: 'low_stock',
                formatted_price: 'Rs. 180.75'
            }
        ],
        summary: {
            total_medicines: 19,
            low_stock: 3,
            out_of_stock: 1,
            good_stock: 15,
            total_stock_value: 125670.50,
            formatted_total_value: 'Rs. 1,25,670.50'
        },
        groups: [
            {
                med_group_name: 'Pain Relief',
                medicine_count: 3,
                total_stock: 158,
                formatted_value: 'Rs. 15,250.00'
            },
            {
                med_group_name: 'Antibiotics',
                medicine_count: 3,
                total_stock: 138,
                formatted_value: 'Rs. 22,450.00'
            }
        ]
    }
};

// Override fetch function for testing
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') {
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        // Check if it's our API call
        if (url.includes('admin-reports.php')) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    let mockData = {};
                    
                    if (url.includes('action=get_sales_report')) {
                        // Extract report type from URL or default to monthly
                        const urlParams = new URLSearchParams(url.split('?')[1]);
                        const reportType = urlParams.get('report_type') || 'monthly';
                        mockData = MOCK_SALES_DATA[reportType] || MOCK_SALES_DATA['monthly'];
                    } else if (url.includes('action=get_inventory_report')) {
                        mockData = MOCK_INVENTORY_DATA;
                    } else {
                        mockData = { success: false, error: 'Unknown action' };
                    }
                    
                    resolve({
                        ok: true,
                        json: () => Promise.resolve(mockData)
                    });
                }, 500); // Simulate network delay
            });
        }
        
        // For other URLs, use original fetch
        return originalFetch(url, options);
    };
}
