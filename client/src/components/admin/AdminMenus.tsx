import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useMenus } from '../../context/MenuContext';
import { MenuItem } from '../../types/menu';

const AdminMenus: React.FC = () => {
  const { mainMenu, updateMenuItem, addMenuItem, deleteMenuItem } = useMenus();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Navigation</h2>
          <p className="text-slate-500 mt-1">Gérez le menu principal du site.</p>
        </div>
        <button 
          onClick={() => addMenuItem({
            id: Date.now().toString(),
            label: 'Nouveau Menu',
            type: 'simple',
            basePath: '/',
            items: []
          })}
          className="bg-brand-coral text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-500 transition-colors"
        >
          <Plus size={18} /> Ajouter un élément
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {mainMenu.map((menu, idx) => (
          <div key={menu.id || idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex-1 mr-4">
                <input 
                  type="text" 
                  value={menu.label}
                  onChange={(e) => updateMenuItem(idx, { ...menu, label: e.target.value })}
                  className="font-bold text-lg text-slate-800 bg-transparent border-none focus:ring-0 p-0 w-full"
                />
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 font-mono">Type:</span>
                    <select 
                      value={menu.type}
                      onChange={(e) => updateMenuItem(idx, { ...menu, type: e.target.value as any })}
                      className="text-xs border-none bg-transparent py-0 pl-1 pr-6 focus:ring-0 text-slate-600 font-bold uppercase cursor-pointer"
                    >
                      <option value="simple">Simple</option>
                      <option value="grid">Grille</option>
                      <option value="columns">Colonnes</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 font-mono">Path:</span>
                    <input 
                      type="text" 
                      value={menu.basePath}
                      onChange={(e) => updateMenuItem(idx, { ...menu, basePath: e.target.value })}
                      className="text-xs border-none bg-transparent p-0 focus:ring-0 text-slate-600 font-mono w-32"
                    />
                  </div>
                </div>
              </div>
              <button 
                onClick={() => deleteMenuItem(idx)}
                className="text-gray-300 hover:text-red-500 p-2 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="p-4 bg-white">
              {menu.type === 'columns' ? (
                <div className="space-y-4">
                  {(menu.columns || []).map((col, colIdx) => (
                    <div key={colIdx} className="border border-gray-100 rounded-lg p-3 bg-slate-50">
                      <div className="flex justify-between items-center mb-2">
                        <input 
                          type="text"
                          value={col.title}
                          onChange={(e) => {
                            const newCols = [...(menu.columns || [])];
                            newCols[colIdx] = { ...col, title: e.target.value };
                            updateMenuItem(idx, { ...menu, columns: newCols });
                          }}
                          className="font-bold text-sm bg-transparent border-none p-0 focus:ring-0 text-slate-700"
                          placeholder="Titre de la colonne"
                        />
                        <button 
                          onClick={() => {
                            const newCols = (menu.columns || []).filter((_, i) => i !== colIdx);
                            updateMenuItem(idx, { ...menu, columns: newCols });
                          }}
                          className="text-gray-300 hover:text-red-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {col.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="bg-white border border-gray-200 rounded px-2 py-1 text-xs flex items-center gap-1">
                            <input 
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const newItems = [...col.items];
                                newItems[itemIdx] = e.target.value;
                                const newCols = [...(menu.columns || [])];
                                newCols[colIdx] = { ...col, items: newItems };
                                updateMenuItem(idx, { ...menu, columns: newCols });
                              }}
                              className="border-none p-0 text-xs w-24 focus:ring-0"
                            />
                            <button 
                              onClick={() => {
                                const newItems = col.items.filter((_, i) => i !== itemIdx);
                                const newCols = [...(menu.columns || [])];
                                newCols[colIdx] = { ...col, items: newItems };
                                updateMenuItem(idx, { ...menu, columns: newCols });
                              }}
                              className="text-gray-300 hover:text-red-400"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            const newItems = [...col.items, 'Nouveau'];
                            const newCols = [...(menu.columns || [])];
                            newCols[colIdx] = { ...col, items: newItems };
                            updateMenuItem(idx, { ...menu, columns: newCols });
                          }}
                          className="bg-white border border-dashed border-gray-300 text-gray-400 hover:text-brand-coral hover:border-brand-coral rounded px-2 py-1 text-xs transition-colors"
                        >
                          + Item
                        </button>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newCols = [...(menu.columns || []), { title: 'Nouvelle Colonne', items: [] }];
                      updateMenuItem(idx, { ...menu, columns: newCols });
                    }}
                    className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-400 hover:text-brand-coral hover:border-brand-coral text-sm font-bold transition-colors"
                  >
                    + Ajouter une colonne
                  </button>
                </div>
              ) : (
                // Simple or Grid (List of items)
                (<div className="flex flex-wrap gap-2">
                  {(menu.items || []).map((item, itemIdx) => (
                    <div key={itemIdx} className="bg-slate-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2 group">
                      <input 
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const newItems = [...(menu.items || [])];
                          newItems[itemIdx] = e.target.value;
                          updateMenuItem(idx, { ...menu, items: newItems });
                        }}
                        className="bg-transparent border-none p-0 focus:ring-0 w-32 text-slate-700 font-medium"
                      />
                      <button 
                        onClick={() => {
                          const newItems = (menu.items || []).filter((_, i) => i !== itemIdx);
                          updateMenuItem(idx, { ...menu, items: newItems });
                        }}
                        className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newItems = [...(menu.items || []), 'Nouveau lien'];
                      updateMenuItem(idx, { ...menu, items: newItems });
                    }}
                    className="bg-white border border-dashed border-gray-300 text-gray-400 hover:text-brand-coral hover:border-brand-coral rounded-lg px-3 py-1.5 text-sm font-bold transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} /> Ajouter
                  </button>
                </div>)
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminMenus;
