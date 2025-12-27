import React, { useState } from 'react';
import { Printer, Plus, Edit2, Trash2, Globe, X } from 'lucide-react';
import { Printer as PrinterType } from '../../types/admin';

const AdminPrinters: React.FC = () => {
  const [printers, setPrinters] = useState<PrinterType[]>(() => {
    try {
        const saved = localStorage.getItem('admin_printers');
        return saved ? JSON.parse(saved) : [
            { id: 'PRT-001', name: 'PrintHouse Pro', countryCodes: ['FR', 'BE', 'LU'], contactEmail: 'print@printhouse.com', productionDelayDays: 3 },
            { id: 'PRT-002', name: 'SwissPrint', countryCodes: ['CH'], contactEmail: 'orders@swissprint.ch', productionDelayDays: 2 },
            { id: 'PRT-003', name: 'Maple Press', countryCodes: ['CA'], contactEmail: 'hello@maplepress.ca', productionDelayDays: 5 }
        ];
    } catch (e) {
        console.error('Error loading printers', e);
        return [
            { id: 'PRT-001', name: 'PrintHouse Pro', countryCodes: ['FR', 'BE', 'LU'], contactEmail: 'print@printhouse.com', productionDelayDays: 3 },
            { id: 'PRT-002', name: 'SwissPrint', countryCodes: ['CH'], contactEmail: 'orders@swissprint.ch', productionDelayDays: 2 },
            { id: 'PRT-003', name: 'Maple Press', countryCodes: ['CA'], contactEmail: 'hello@maplepress.ca', productionDelayDays: 5 }
        ];
    }
  });

  const [editingPrinterId, setEditingPrinterId] = useState<string | null>(null);

  React.useEffect(() => {
    try {
        localStorage.setItem('admin_printers', JSON.stringify(printers));
    } catch (e) {
        console.error('Error saving printers', e);
    }
  }, [printers]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Imprimeurs</h2>
          <p className="text-slate-500 mt-1">Gérez vos partenaires d'impression par région.</p>
        </div>
        <button 
          onClick={() => {
            const newPrinter: PrinterType = {
              id: `PRT-${Date.now()}`,
              name: 'Nouvel Imprimeur',
              countryCodes: [],
              contactEmail: '',
              productionDelayDays: 3
            };
            setPrinters([...printers, newPrinter]);
            setEditingPrinterId(newPrinter.id);
          }}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-md"
        >
          <Plus size={18} />
          Ajouter
        </button>
      </div>

      <div className="grid gap-4">
        {printers.map(printer => (
          <div key={printer.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            {editingPrinterId === printer.id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nom</label>
                    <input 
                      type="text" 
                      value={printer.name}
                      onChange={(e) => setPrinters(printers.map(p => p.id === printer.id ? {...p, name: e.target.value} : p))}
                      className="w-full text-sm border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Email Contact</label>
                    <input 
                      type="text" 
                      value={printer.contactEmail || ''}
                      onChange={(e) => setPrinters(printers.map(p => p.id === printer.id ? {...p, contactEmail: e.target.value} : p))}
                      className="w-full text-sm border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Pays supportés (codes ISO)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {printer.countryCodes.map(code => (
                      <span key={code} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                        {code}
                        <button onClick={() => setPrinters(printers.map(p => p.id === printer.id ? {...p, countryCodes: p.countryCodes.filter(c => c !== code)} : p))}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <input 
                      type="text" 
                      placeholder="+ AJOUTER (Ex: FR)"
                      className="bg-transparent border border-dashed border-gray-300 rounded px-2 py-1 text-xs uppercase w-32 focus:w-40 transition-all outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const code = e.currentTarget.value.toUpperCase();
                          if (code && !printer.countryCodes.includes(code)) {
                            setPrinters(printers.map(p => p.id === printer.id ? {...p, countryCodes: [...p.countryCodes, code]} : p));
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">Appuyez sur Entrée pour ajouter un code pays.</p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    onClick={() => setEditingPrinterId(null)}
                    className="px-4 py-2 bg-green-50 text-green-700 font-bold text-xs rounded hover:bg-green-100"
                  >
                    Terminer
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                    <Printer size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{printer.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="font-mono bg-slate-100 px-1 rounded">{printer.id}</span>
                      <span>•</span>
                      <span>{printer.contactEmail}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-slate-400" />
                    <div className="flex gap-1">
                      {printer.countryCodes.map(code => (
                        <span key={code} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-l border-gray-100 pl-6">
                    <button 
                      onClick={() => setEditingPrinterId(printer.id)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('Supprimer cet imprimeur ?')) {
                          setPrinters(printers.filter(p => p.id !== printer.id));
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPrinters;
