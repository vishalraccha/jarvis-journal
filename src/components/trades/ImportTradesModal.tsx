import React, { useState } from 'react'
import { X, Upload, FileText, Download, CheckCircle2, AlertCircle } from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { TradeDirection, TradeStatus, AssetClass } from '@/types/database'

interface ImportTradesModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
}

export const ImportTradesModal: React.FC<ImportTradesModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const { activeAccount, accounts } = useAuth()
  const [fileContent, setFileContent] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  if (!isOpen) return null

  const handleDownloadSampleCSV = () => {
    const csvHeader = 'symbol,asset_class,direction,open_time,close_time,quantity,entry_price,exit_price,stop_loss,take_profit,commission,fees,strategy,notes\n'
    const sampleRows = [
      'NQ,futures,long,2026-11-10 09:35:00,2026-11-10 10:15:00,2,20800,20880,20750,20900,4.5,1.0,Opening Range Breakout,Clean 5m breakout candle',
      'ES,futures,short,2026-11-11 10:00:00,2026-11-11 10:45:00,2,5960,5942,5970,5930,4.5,1.0,ICT Silver Bullet,Liquidity sweep at 5970',
      'BTC/USDT,crypto,long,2026-11-12 14:00:00,2026-11-12 16:30:00,0.5,91200,92400,90500,93000,2.0,0.5,VWAP Mean Reversion,Bounced off VWAP lower band',
      'NVDA,stocks,long,2026-11-13 09:45:00,2026-11-13 11:00:00,100,144.50,148.20,142.50,150.00,0.0,0.0,ORB Breakout,Strong volume follow-through',
    ].join('\n')

    const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'jarvis_journal_sample_trades.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setErrorMsg('')
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setFileContent(text)
      parsePreview(text)
    }
    reader.readAsText(file)
  }

  const parsePreview = (csvText: string) => {
    try {
      const lines = csvText.trim().split('\n').filter(l => l.trim().length > 0)
      if (lines.length < 2) {
        setErrorMsg('CSV file is empty or missing data rows')
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const parsed = lines.slice(1, 6).map((line) => {
        const values = line.split(',').map(v => v.trim())
        const row: any = {}
        headers.forEach((h, i) => {
          row[h] = values[i]
        })
        return row
      })

      setPreviewRows(parsed)
    } catch (err: any) {
      setErrorMsg(`Failed to parse CSV: ${err.message}`)
    }
  }

  const handleExecuteImport = async () => {
    if (!fileContent) {
      setErrorMsg('Please select a valid CSV file')
      return
    }

    try {
      setIsProcessing(true)
      const lines = fileContent.trim().split('\n').filter(l => l.trim().length > 0)
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

      const targetAccountId = activeAccount?.id || accounts[0]?.id
      if (!targetAccountId) {
        setErrorMsg('No active trading account found. Create or select an account first.')
        return
      }

      let importedCount = 0

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const row: any = {}
        headers.forEach((h, idx) => {
          row[h] = values[idx]
        })

        if (!row.symbol || !row.entry_price) continue

        const entryPrice = parseFloat(row.entry_price) || 0
        const exitPrice = row.exit_price ? parseFloat(row.exit_price) : null
        const qty = parseFloat(row.quantity) || 1
        const dir: TradeDirection = (row.direction || 'long').toLowerCase() === 'short' ? 'short' : 'long'
        const stat: TradeStatus = exitPrice ? 'closed' : 'open'
        const openTime = row.open_time ? new Date(row.open_time).toISOString() : new Date().toISOString()
        const closeTime = exitPrice && row.close_time ? new Date(row.close_time).toISOString() : null

        await api.createTrade({
          user_id: 'user-jarvis-1',
          account_id: targetAccountId,
          symbol: row.symbol.toUpperCase(),
          asset_class: (row.asset_class || 'stocks') as AssetClass,
          direction: dir,
          status: stat,
          open_time: openTime,
          close_time: closeTime,
          quantity: qty,
          entry_price: entryPrice,
          exit_price: exitPrice,
          stop_loss: row.stop_loss ? parseFloat(row.stop_loss) : null,
          take_profit: row.take_profit ? parseFloat(row.take_profit) : null,
          gross_pnl: 0,
          commission: row.commission ? parseFloat(row.commission) : 0,
          fees: row.fees ? parseFloat(row.fees) : 0,
          net_pnl: 0,
          roi_percentage: 0,
          r_multiple: null,
          setup: row.setup || row.strategy || null,
          notes: row.notes || null,
        })
        importedCount++
      }

      onImportComplete()
      onClose()
    } catch (err: any) {
      setErrorMsg(`Import failed: ${err.message || 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-xl border border-[#263448] bg-[#090D14] shadow-2xl animate-in fade-in zoom-in-95 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#263448] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#287BFF]/20 text-[#4095FF]">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#EAF0F8]">Import Trades via CSV</h2>
              <p className="text-xs text-[#8493A8]">Upload historical trades from broker or platform exports</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8493A8] hover:bg-[#151E2B] hover:text-[#EAF0F8]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Sample CSV Download pill */}
          <div className="flex items-center justify-between rounded-lg border border-[#263448] bg-[#101722] p-3 text-xs">
            <div>
              <span className="font-medium text-[#EAF0F8]">Need the standard template?</span>
              <p className="text-[#8493A8]">Download our preformatted sample CSV with columns ready.</p>
            </div>
            <button
              onClick={handleDownloadSampleCSV}
              className="flex items-center gap-1.5 rounded-md border border-[#263448] bg-[#151E2B] px-3 py-1.5 font-medium text-[#4095FF] hover:bg-[#287BFF]/10"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Sample CSV</span>
            </button>
          </div>

          {/* Upload Area */}
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#263448] rounded-xl p-8 hover:border-[#287BFF] transition-colors cursor-pointer bg-[#101722]/50">
            <FileText className="h-10 w-10 text-[#287BFF] mb-2" />
            <span className="text-sm font-semibold text-[#EAF0F8]">
              {fileName ? fileName : 'Click to select CSV file'}
            </span>
            <span className="text-xs text-[#8493A8] mt-1">Supports UTF-8 CSV exports</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-[#F05265]/40 bg-[#F05265]/10 p-3 text-xs text-[#F05265]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview Table */}
          {previewRows.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#8493A8] uppercase tracking-wider">
                Preview (First {previewRows.length} rows)
              </span>
              <div className="overflow-x-auto rounded-lg border border-[#263448]">
                <table className="w-full text-left text-[11px]">
                  <thead className="border-b border-[#263448] bg-[#151E2B] text-[#8493A8]">
                    <tr>
                      <th className="p-2">Symbol</th>
                      <th className="p-2">Dir</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2">Entry</th>
                      <th className="p-2">Exit</th>
                      <th className="p-2">Strategy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#263448] bg-[#101722]">
                    {previewRows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-mono font-bold text-[#EAF0F8]">{row.symbol}</td>
                        <td className="p-2 uppercase font-medium">{row.direction}</td>
                        <td className="p-2 font-mono">{row.quantity}</td>
                        <td className="p-2 font-mono">${row.entry_price}</td>
                        <td className="p-2 font-mono">${row.exit_price || '-'}</td>
                        <td className="p-2 truncate max-w-[120px] text-[#8493A8]">{row.strategy || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-[#263448] pt-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-[#263448] bg-[#101722] px-4 py-2 text-xs font-medium text-[#8493A8] hover:text-[#EAF0F8]"
            >
              Cancel
            </button>
            <button
              disabled={previewRows.length === 0 || isProcessing}
              onClick={handleExecuteImport}
              className="flex items-center gap-2 rounded-lg bg-[#287BFF] px-5 py-2 text-xs font-semibold text-white shadow-md shadow-[#287BFF]/25 hover:bg-[#4095FF] disabled:opacity-50"
            >
              {isProcessing ? 'Importing Trades...' : 'Confirm & Ingest Trades'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
