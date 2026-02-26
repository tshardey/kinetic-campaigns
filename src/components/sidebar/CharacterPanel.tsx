import { useState } from 'react';
import { Sparkles, BookOpen, ChevronDown, ChevronUp, Package, X } from 'lucide-react';
import type { Character, CharacterResources, Progression, InventoryItem } from '@/types/character';
import type { ActivityType } from '@/types/character';
import { getXpCap } from '@/engine/progression';
import { getPlaybook } from '@/data/playbooks';
import { consumableRequiresChoice } from '@/engine/inventory';
import { ResourceDisplay } from './ResourceDisplay';
import { ActivityLogger } from './ActivityLogger';

interface CharacterPanelProps {
  character: Character;
  progression: Progression;
  resources: CharacterResources;
  inventory: InventoryItem[];
  onLogActivity: (type: ActivityType, durationMinutes?: number) => void;
  onUseConsumable: (item: InventoryItem, choice?: 'haste' | 'flow') => void;
  /** When set, show a close button (e.g. for mobile overlay). */
  onCloseSidebar?: () => void;
}

export function CharacterPanel({
  character,
  progression,
  resources,
  inventory,
  onLogActivity,
  onUseConsumable,
  onCloseSidebar,
}: CharacterPanelProps) {
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [inventoryExpanded, setInventoryExpanded] = useState(true);
  const [vialChoiceFor, setVialChoiceFor] = useState<string | null>(null);
  const xpCap = getXpCap(progression.level);
  const xpPercent = (progression.xp / xpCap) * 100;
  const playbook = getPlaybook(character.playbook);
  const startingMove = playbook?.startingMoves.find((m) => m.id === character.startingMoveId);

  return (
    <aside className="w-80 h-full bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl">
      <div className="p-4 md:p-6 border-b border-slate-800 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500 mb-1">
            Kinetic Campaigns
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            {character.name || 'The Worldhopper'}
          </p>
        </div>
        {onCloseSidebar && (
          <button
            type="button"
            onClick={onCloseSidebar}
            className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 shrink-0 touch-manipulation"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Character sheet: playbook, stats, starting move (collapsible) */}
      <div className="border-b border-slate-800 bg-slate-800/30">
        <button
          type="button"
          onClick={() => setSheetExpanded((e) => !e)}
          className="w-full p-4 flex items-center justify-between gap-2 text-left hover:bg-slate-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-inset rounded-none"
          aria-expanded={sheetExpanded}
          aria-controls="character-sheet-content"
          id="character-sheet-toggle"
        >
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" /> Character sheet
          </span>
          {sheetExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" aria-hidden />
          )}
        </button>
        {sheetExpanded && playbook && (
          <div
            id="character-sheet-content"
            role="region"
            aria-labelledby="character-sheet-toggle"
            className="px-4 pb-4 space-y-3"
          >
            <div>
              <p className="text-sm font-semibold text-teal-400">{playbook.name}</p>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{playbook.description}</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ['brawn', 'Br'],
                  ['flow', 'Fl'],
                  ['haste', 'Ha'],
                  ['focus', 'Fo'],
                ] as const
              ).map(([stat, label]) => {
                const value = character.stats[stat];
                const isPositive = value >= 0;
                return (
                  <div
                    key={stat}
                    className="bg-slate-800 rounded-lg px-2 py-1.5 text-center"
                    title={stat.charAt(0).toUpperCase() + stat.slice(1)}
                  >
                    <p className="text-[10px] uppercase text-slate-500 font-medium">{label}</p>
                    <p
                      className={`text-sm font-bold tabular-nums ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {value >= 0 ? '+' : ''}{value}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="pt-1 border-t border-slate-700 grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-medium mb-0.5">Current HP</p>
                <p className="text-sm font-bold tabular-nums text-white">
                  {character.hp ?? character.maxHp ?? 5}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-medium mb-0.5">Max HP</p>
                <p className="text-sm font-bold tabular-nums text-white">
                  {character.maxHp ?? 5}
                </p>
              </div>
            </div>
            {startingMove && (
              <div className="pt-1 border-t border-slate-700">
                <p className="text-[10px] uppercase text-slate-500 font-medium mb-0.5">
                  Starting move
                </p>
                <p className="text-xs font-medium text-white">{startingMove.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                  {startingMove.description}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inventory */}
      <div className="border-b border-slate-800 bg-slate-800/30">
        <button
          type="button"
          onClick={() => setInventoryExpanded((e) => !e)}
          className="w-full p-4 flex items-center justify-between gap-2 text-left hover:bg-slate-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-inset rounded-none"
          aria-expanded={inventoryExpanded}
          aria-controls="inventory-content"
          id="inventory-toggle"
        >
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Package className="w-3.5 h-3.5" /> Inventory
            {(inventory?.length ?? 0) > 0 && (
              <span className="bg-slate-600 text-slate-200 text-[10px] px-1.5 py-0.5 rounded">
                {inventory?.length ?? 0}
              </span>
            )}
          </span>
          {inventoryExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" aria-hidden />
          )}
        </button>
        {inventoryExpanded && (
          <div
            id="inventory-content"
            role="region"
            aria-labelledby="inventory-toggle"
            className="px-4 pb-4 max-h-64 overflow-y-auto"
          >
            {(inventory?.length ?? 0) === 0 ? (
              <p className="text-xs text-slate-500 py-2">No items yet. Clear encounters for loot.</p>
            ) : (
              <ul className="space-y-2">
                {(inventory ?? []).map((item, index) => (
                  <li
                    key={`${item.id}-${index}`}
                    className="bg-slate-800 rounded-lg p-2 flex items-start gap-2"
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt=""
                        className="w-10 h-10 object-contain shrink-0 rounded"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase">
                        {item.kind === 'artifact' ? 'Artifact (buff applied)' : 'Consumable'}
                      </p>
                      {item.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      {item.kind === 'consumable' && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {vialChoiceFor === item.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  onUseConsumable(item, 'haste');
                                  setVialChoiceFor(null);
                                }}
                                className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded"
                              >
                                Restore Haste
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onUseConsumable(item, 'flow');
                                  setVialChoiceFor(null);
                                }}
                                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded"
                              >
                                Restore Flow
                              </button>
                              <button
                                type="button"
                                onClick={() => setVialChoiceFor(null)}
                                className="text-xs text-slate-400 hover:text-slate-300"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                consumableRequiresChoice(item.id)
                                  ? setVialChoiceFor(item.id)
                                  : onUseConsumable(item)
                              }
                              className="text-xs bg-teal-600 hover:bg-teal-500 text-white px-2 py-1 rounded"
                            >
                              Use
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Level & XP */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/50">
        <div className="flex justify-between items-end mb-2">
          <div>
            <span className="text-sm text-slate-400">Level</span>
            <span className="text-2xl font-bold text-white ml-2">{progression.level}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-amber-400 font-bold flex items-center">
              <Sparkles className="w-3 h-3 mr-1" /> {progression.currency} Currency
            </span>
          </div>
        </div>
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
        <div className="text-right mt-1 text-xs text-slate-500">
          {progression.xp} / {xpCap} XP
        </div>
      </div>

      {/* Resources & Activity Log */}
      <div className="p-6 border-b border-slate-800 flex-1 overflow-y-auto">
        <ResourceDisplay resources={resources} />
        <ActivityLogger onLogActivity={onLogActivity} />
      </div>
    </aside>
  );
}
