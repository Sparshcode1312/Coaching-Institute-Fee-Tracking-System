import React, { useState } from 'react';
import { Button } from '../../components/common/Button.js';
import { AccountsHeader } from '../../components/accounts/AccountsHeader.js';
import {
  FileSpreadsheet,
  Download,
  CheckCircle,
  Code,
  Calendar,
  Building2,
  FileCheck2,
} from 'lucide-react';

export const TallyExportView: React.FC = () => {
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-11-05');
  const [selectedCentre, setSelectedCentre] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [xmlPreview, setXmlPreview] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleFetchPreview = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(
        `/api/v1/accounts/export/tally?startDate=${startDate}&endDate=${endDate}&centreId=${selectedCentre}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate Tally XML export.');
      }

      const xmlText = await response.text();
      setXmlPreview(xmlText);
    } catch (err: any) {
      alert(err.message || 'Export error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadXml = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(
        `/api/v1/accounts/export/tally?startDate=${startDate}&endDate=${endDate}&centreId=${selectedCentre}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      const xmlText = await response.text();
      const blob = new Blob([xmlText], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tally_Vouchers_${startDate}_to_${endDate}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4500);
    } catch (err: any) {
      alert(err.message || 'Failed to download XML');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', color: 'var(--text)' }}>
      <AccountsHeader />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* Page Title Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: '8px',
                backgroundColor: 'var(--surface-soft)',
                border: '1px solid var(--border-soft)',
                color: 'var(--text)',
              }}
            >
              <FileSpreadsheet size={20} />
            </span>
            <div>
              <h1
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  letterSpacing: '-0.025em',
                  margin: 0,
                }}
              >
                Tally ERP 9 / TallyPrime XML Integration
              </h1>
              <div style={{ fontSize: '0.88rem', color: 'var(--muted)', marginTop: 2 }}>
                Export double-entry accounting vouchers formatted to Tally standard envelope schema
              </div>
            </div>
          </div>
        </div>

        {downloadSuccess && (
          <div
            style={{
              marginBottom: 24,
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(23, 201, 100, 0.08)',
              border: '1px solid rgba(23, 201, 100, 0.25)',
              color: 'var(--text)',
              fontSize: '0.9rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <CheckCircle size={18} color="var(--accent-green)" />
            <span>XML voucher batch downloaded successfully. Ready for direct import into Tally Gateway.</span>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 380px) 1fr',
            gap: 28,
            alignItems: 'start',
          }}
        >
          {/* Export Parameters Panel */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 18 }}>
              Export Parameters
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text)',
                    marginBottom: 6,
                  }}
                >
                  <Building2 size={13} color="var(--muted)" />
                  <span>Centre Filter</span>
                </label>
                <select
                  value={selectedCentre}
                  onChange={(e) => setSelectedCentre(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-soft)',
                    backgroundColor: '#ffffff',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="ALL">All 4 Jaipur Centres (Consolidated)</option>
                  <option value="c0000001-0000-0000-0000-000000000001">Malviya Nagar (Main Campus)</option>
                  <option value="c0000002-0000-0000-0000-000000000002">Vaishali Nagar</option>
                  <option value="c0000003-0000-0000-0000-000000000003">Raja Park</option>
                  <option value="c0000004-0000-0000-0000-000000000004">Vidhyadhar Nagar</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text)',
                    marginBottom: 6,
                  }}
                >
                  <Calendar size={13} color="var(--muted)" />
                  <span>Start Date</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-soft)',
                    backgroundColor: '#ffffff',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text)',
                    marginBottom: 6,
                  }}
                >
                  <Calendar size={13} color="var(--muted)" />
                  <span>End Date</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-soft)',
                    backgroundColor: '#ffffff',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                <Button
                  variant="primary"
                  onClick={handleDownloadXml}
                  isLoading={isExporting}
                  icon={<Download size={16} />}
                >
                  Download Tally XML
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleFetchPreview}
                  disabled={isExporting}
                  icon={<Code size={16} />}
                >
                  Preview XML Vouchers
                </Button>
              </div>

              <div
                style={{
                  marginTop: 12,
                  padding: '14px',
                  backgroundColor: 'var(--surface-soft)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem',
                  color: 'var(--muted)',
                  lineHeight: 1.5,
                  border: '1px solid var(--border-soft)',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                  Ledger Mapping Specification:
                </div>
                <div>&bull; Debits: <code>HDFC Bank A/c #5020...</code> or <code>Cash In Hand</code></div>
                <div>&bull; Credits: <code>Tuition Fee Income</code> (Direct Incomes group)</div>
                <div>&bull; Narration: Student Roll No + Invoice Receipt Ref</div>
              </div>
            </div>
          </div>

          {/* XML Preview Viewport */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
                  Tally Envelope XML Preview
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
                  Standard XML schema representation conforming to TallyPrime data interface
                </div>
              </div>

              {xmlPreview && (
                <Button variant="ghost" size="sm" onClick={handleDownloadXml} icon={<Download size={14} />}>
                  Download XML
                </Button>
              )}
            </div>

            {xmlPreview ? (
              <pre
                style={{
                  backgroundColor: '#0A0A0A',
                  color: '#17C964',
                  padding: 18,
                  borderRadius: 'var(--radius-md)',
                  overflowX: 'auto',
                  fontSize: '0.8rem',
                  fontFamily: 'SFMono-Regular, Consolas, Monaco, monospace',
                  maxHeight: 520,
                  lineHeight: 1.5,
                  margin: 0,
                  border: '1px solid rgba(0,0,0,0.1)',
                }}
              >
                {xmlPreview}
              </pre>
            ) : (
              <div
                style={{
                  padding: '90px 24px',
                  textAlign: 'center',
                  border: '1px dashed var(--border-soft)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--muted)',
                }}
              >
                <FileCheck2 size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                  No XML Preview Loaded
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  Click &ldquo;Preview XML Vouchers&rdquo; to inspect generated ledger schema before downloading.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
