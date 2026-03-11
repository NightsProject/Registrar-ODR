import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import './Transactions.css';
import TotalRequestsIcon from "../../../components/icons/TotalRequestsIcon";
import ProcessedIcon from '../../../components/icons/ProcessedIcon';
import AdminFeeIcon from "../../../components/icons/UnpaidIcon";
import PaidIcon from "../../../components/icons/PaidIcon";
import SearchIcon from "../../../components/icons/SearchIcon";
import CalendarIcon from "../../../components/icons/CalendarIcon";
import SortIcon from "../../../components/icons/SortIcon";
import ExportSelector from "../../../components/common/ExportSelector";

const SummaryCard = ({ title, icon: Icon, value, subText, trend }) => (
  <div className="summary-card">
    <div className="card-header">
      <div className="card-icon">
        <Icon className="icon" width="28" height="28" />
      </div>
      <p className="card-title">{title}</p>
    </div>
    <div className="card-content-body">
      <p className="card-subtext">{subText}</p>
      <div className="card-value-row">
        <h2 className="card-value">{value}</h2>
      </div>
    </div>
  </div>
);

function Transactions() {
  // Helper to get initial state from sessionStorage
  const getStoredState = (key, defaultValue) => {
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  };

  const navigate = useNavigate();
  const [transactions, setTransactions] = useState(() => getStoredState('tx_transactions', []));
  const [page, setPage] = useState(() => getStoredState('tx_page', 1));
  const [limit, setLimit] = useState(() => getStoredState('tx_limit', 10));
  const [total, setTotal] = useState(() => getStoredState('tx_total', 0));
  const [totalPages, setTotalPages] = useState(() => getStoredState('tx_totalPages', 1));
  const [summary, setSummary] = useState(() => getStoredState('tx_summary', { total_amount_completed: 0, total_transactions: 0 }));
  const [search, setSearch] = useState(() => getStoredState('tx_search', ''));
  const [sortOrder, setSortOrder] = useState(() => getStoredState('tx_sortOrder', 'desc'));
  const [startDate, setStartDate] = useState(() => getStoredState('tx_startDate', ''));
  const [endDate, setEndDate] = useState(() => getStoredState('tx_endDate', ''));
  const [range, setRange] = useState(() => getStoredState('tx_range', 'all'));
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showLimitMenu, setShowLimitMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const totalAdminFee = transactions.reduce((total, t) => total + (t.admin_fee || 0), 0);
  const toISODate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /* Fetch transactions and summary */
  useEffect(() => {
    fetchTransactions();
    fetchSummary();
  }, [page, limit, search, sortOrder, startDate, endDate]);

  /* Save state to sessionStorage */
  useEffect(() => {
    sessionStorage.setItem('tx_transactions', JSON.stringify(transactions));
    sessionStorage.setItem('tx_page', JSON.stringify(page));
    sessionStorage.setItem('tx_limit', JSON.stringify(limit));
    sessionStorage.setItem('tx_total', JSON.stringify(total));
    sessionStorage.setItem('tx_totalPages', JSON.stringify(totalPages));
    sessionStorage.setItem('tx_summary', JSON.stringify(summary));
    sessionStorage.setItem('tx_search', JSON.stringify(search));
    sessionStorage.setItem('tx_sortOrder', JSON.stringify(sortOrder));
    sessionStorage.setItem('tx_startDate', JSON.stringify(startDate));
    sessionStorage.setItem('tx_endDate', JSON.stringify(endDate));
    sessionStorage.setItem('tx_range', JSON.stringify(range));
  }, [transactions, page, limit, total, totalPages, summary, search, sortOrder, startDate, endDate, range]);

  /* Fetch transactions */
  /* Returns paginated list of transactions based on filters */
  async function fetchTransactions() {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (search) params.append('search', search);
    if (sortOrder) params.append('sort', sortOrder);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    try {
      const res = await fetch(`/api/admin/transactions?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.status === 401) {
        navigate('/admin/login');
        return;
      }

      const data = await res.json();
      if (data.transactions) {
        setTransactions(data.transactions);
        setTotal(data.total);
        setTotalPages(data.total_pages || 1);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  }

  /* Fetch summary */
  /* Returns summary of transactions based on filters */
  async function fetchSummary() {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    try {
      /* fetch summary from the backend */
      const res = await fetch('/api/admin/transactions/summary?'+params.toString(), {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.status === 401) {
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  }

  /* Apply date range filters */
  /* Sets startDate and endDate based on predefined ranges */
  /* 7: last 7 days, 30: last 30 days, month: current month, year: current year, all: no filter */
  function applyDateRange(selectedRange) {
    setRange(selectedRange);
    const now = new Date();

    let start = '';
    let end = '';

    switch (selectedRange) {
      case '7': {
        const s = new Date(now);
        s.setDate(now.getDate() - 6);
        start = toISODate(s);
        end = toISODate(now);
        break;
      }

      case '30': {
        const s = new Date(now);
        s.setDate(now.getDate() - 29);
        start = toISODate(s);
        end = toISODate(now);
        break;
      }

      case 'month': {
        // First day of current month
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        // Last day of current month
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        start = toISODate(firstDay);
        end = toISODate(lastDay);
        break;
      }

      case 'year': {
        const firstDay = new Date(now.getFullYear(), 0, 1);
        const lastDay = new Date(now.getFullYear(), 11, 31);

        start = toISODate(firstDay);
        end = toISODate(lastDay);
        break;
      }

      default:
        start = '';
        end = '';
    }

    setStartDate(start);
    setEndDate(end);
  }

  /* Helper to format date: November 10, 2025, 10:00 PM */
  function formatPaymentDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).replace(' at', ',');
  }

  /* Helper to get timeframe string */
  function getTimeframeString() {
    if (!startDate && !endDate) return '';
    const start = startDate ? new Date(`${startDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    const end = endDate ? new Date(`${endDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    
    if (start && end) return `${start} - ${end}`;
    return `${start || end}`;
  }

  /* Downloads the current transactions list as a csv file */
  function downloadCSV() {
    const csvRows = [];
    const headers = ['Request ID', 'User', 'Student ID', 'Amount', 'Payment Date'];
    /* Add the headers row to the csv row array */
    csvRows.push(headers.join(','));

    /* Loop thhrough transactions and add each as a row */
    transactions.forEach((t) => {
      const formattedDate = formatPaymentDate(t.payment_date);
      csvRows.push(
        [
          t.request_id,
          t.full_name,
          t.student_id,
          t.amount,
          `"${formattedDate}"`
        ].join(',')
      );
    });
    /* Download the csv file */
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    let filename = 'Transactions.csv';
    const timeframe = getTimeframeString();
    if (timeframe) {
      filename = `Transactions_${timeframe.replace(/,/g, '').replace(/\s+/g, '_')}.csv`;
    }
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /* Downloads the current transactions list as a pdf file */
  function downloadPDF() {
    const element = document.querySelector('.transactions-page');
    const clone = element.cloneNode(true);
    clone.classList.add('print-mode');

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '100%';
    container.appendChild(clone);
    document.body.appendChild(container);
    
    let filename = 'Transactions.pdf';
    const timeframe = getTimeframeString();
    if (timeframe) {
      filename = `Transactions_${timeframe.replace(/,/g, '').replace(/\s+/g, '_')}.pdf`;
    }

    const opt = {
      margin: 0.5,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, scrollY: 0 },
      jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' }
    };

    // Generate PDF
    html2pdf().set(opt).from(clone).save().then(() => {
      document.body.removeChild(container);
    }).catch((err) => {
      console.error(err);
      document.body.removeChild(container);
    });
  }

  return (
    <div className="transactions-page">
      {/* Print Report Header */}
      <div className="print-report-header">
        <div className="print-header-top">
          <img src="/assets/MSUIITLogo.png" alt="MSUIIT Logo" className="sidebar-brand-logo" />
          <div className="print-header-details">
            <h1>Mindanao State Universityy - Iligan Institute of Technology</h1>
            <p>Office of the University Registrar</p>
          </div>
        </div>
      </div>

      {/* Print Title */}
      <div className="print-title">
        <h2>Transactions Report</h2>
        <p>{getTimeframeString()}</p>
      </div>

      {/* Header */}
      <div className="dashboard-header-wrapper">
          <div style={{ display: 'flex', flexDirection: 'row'}}>
            <h1>Transactions Management</h1>
          </div>

        <div className="header-actions">
          <div 
            className="date-filter-container"
            tabIndex={0}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setShowDateFilter(false);
              }
            }}
          >
            <button className="date-filter-btn" onClick={() => setShowDateFilter(!showDateFilter)}>
              <CalendarIcon className="calendar-icon" width="16" height="16" style={{ marginRight: '8px' }} />
              <span>{range === 'all' && !startDate ? 'All Time' : getTimeframeString() || 'Select Date Range'}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            
            {showDateFilter && (
              <div className="date-filter-popup">
                <div className="date-inputs-row">
                  <div className="date-field">
                    <label>Start Date</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setRange('custom');
                      }} 
                    />
                  </div>
                  <div className="date-field">
                    <label>End Date</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setRange('custom');
                      }} 
                    />
                  </div>
                </div>
                <div className="predefined-ranges">
                  <button className="range-option" onClick={() => { applyDateRange('7'); setShowDateFilter(false); }}>Last 7 Days</button>
                  <button className="range-option" onClick={() => { applyDateRange('30'); setShowDateFilter(false); }}>Last 30 Days</button>
                  <button className="range-option" onClick={() => { applyDateRange('month'); setShowDateFilter(false); }}>This Month</button>
                  <button className="range-option" onClick={() => { applyDateRange('year'); setShowDateFilter(false); }}>This Year</button>
                  <button className="range-option" onClick={() => { applyDateRange('all'); setShowDateFilter(false); }}>All Time</button>
                </div>
              </div>
            )}
          </div>

          <ExportSelector 
            actions={[
              { label: 'CSV', onClick: downloadCSV },
              { label: 'PDF', onClick: downloadPDF }
            ]} 
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards-content">
        <div className="summary-cards-wrapper">
          <div className="summary-card-inner-scroll">
            <SummaryCard 
              title="Total Requests" 
              icon={TotalRequestsIcon} 
              value={summary?.total_transactions || 0}
              subText={startDate || endDate ? "Transactions in selected period" : "All time transactions"}
            />
            <SummaryCard 
              title="Paid Requests" 
              icon={PaidIcon} 
              value={summary?.total_paid || 0}
              subText="Completed payments"
            />
            <SummaryCard 
              title="Total Amount Paid" 
              icon={ProcessedIcon} 
              value={`₱${(summary?.total_amount_completed || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subText="Total revenue from requests"
            />
            <SummaryCard 
              title="Total Admin Fee Collected" 
              icon={AdminFeeIcon} 
              value={`₱${totalAdminFee.toLocaleString()}`}
              subText="Accumulated fees"
            />
          </div>
        </div>
      </div>

      {/* Main Content / Table */}
      <div className="transaction-table-wrapper">
        <div className="transactions-list-header">
          <h2 className="transactions-list-title">Transaction List</h2>
          
          <div className="transactions-controls">
            <div className="search-input-wrapper">
              <SearchIcon className="search-icon" />
              <input 
                className="header-search" 
                placeholder="Search..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
            
            <div 
              className="sort-select-wrapper" 
              onClick={() => setShowSortMenu(!showSortMenu)}
              tabIndex={0}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setShowSortMenu(false);
                }
              }}
            >
              <SortIcon className="sort-icon" width="16" height="16" />
              <span className="sort-select-text">
                {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
              </span>
              
              {showSortMenu && (
                <div className="sort-dropdown-menu">
                  <div className={`sort-option ${sortOrder === 'desc' ? 'selected' : ''}`} onClick={() => setSortOrder('desc')}>Newest First</div>
                  <div className={`sort-option ${sortOrder === 'asc' ? 'selected' : ''}`} onClick={() => setSortOrder('asc')}>Oldest First</div>
                </div>
              )}
            </div>

            <div className="limit-controls-group">
              <span>Show</span>
              <div 
                className="limit-select-wrapper" 
                onClick={() => setShowLimitMenu(!showLimitMenu)}
                tabIndex={0}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setShowLimitMenu(false);
                  }
                }}
              >
                <span className="limit-select-text" style={{ fontWeight: 'normal' }}>{limit}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`limit-select-arrow ${showLimitMenu ? 'rotate' : ''}`}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
                
                {showLimitMenu && (
                  <div className="limit-dropdown-menu">
                    {[10, 20, 50, 100].map((opt) => (
                      <div 
                        key={opt}
                        className={`limit-option ${limit === opt ? 'selected' : ''}`} 
                        onClick={() => { setLimit(opt); setPage(1); }}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span>entries</span>
            </div>
          </div>
        </div>

        <div className="transactions-table-container">
          <table className="transactions-table">
            <thead>
              <tr>
                <th className="th-request-id">Request ID</th>
                <th className="th-user">User</th>
                <th className="th-student-id">Student ID</th>
                <th className="th-amount">Amount</th>
                <th className="th-date">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 py-4">
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-center text-gray-500">No transactions found</td>
                </tr>
              )}
              {transactions.map((tx) => (
                <tr key={tx.request_id}>
                  <td className="td-request-id">
                    <Link to={`/admin/requests/${tx.request_id}`}>{tx.request_id}</Link>
                  </td>
                  <td className="td-user-name">
                    {tx.full_name}
                  </td>
                  <td className="td-student-id">{tx.student_id}</td>
                  <td className="td-amount">
                    ₱{parseFloat(tx.amount).toFixed(2)}
                  </td>
                  <td className="td-date">
                    {formatPaymentDate(tx.payment_date) || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="transactions-pagination">
          <button 
            className="pagination-btn" 
            onClick={() => setPage(Math.max(1, page - 1))} 
            disabled={page === 1}
          >
            Prev
          </button>
          <span className="pagination-info">Page {page} of {totalPages} ({total} items)</span>
          <button 
            className="pagination-btn" 
            onClick={() => setPage(Math.min(totalPages, page + 1))} 
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default Transactions;
