import { For, onMount, Show, createSignal } from 'solid-js';
import type { Component } from 'solid-js';
import { loadAllThemes, allThemes, selectTheme, currentThemeName, addCustomTheme } from '../store/themeStore';
import { exportAllData, importAllData, clearAllData } from '../utils/dataTransfer';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: Component<SettingsModalProps> = (props) => {
  const [clearOpen, setClearOpen] = createSignal(false);
  const [clearText, setClearText] = createSignal('');
  const [createOpen, setCreateOpen] = createSignal(false);
  const [newName, setNewName] = createSignal('');
  const [mainColor, setMainColor] = createSignal('#88b04b');
  const [color2, setColor2] = createSignal('#6a8a3a');
  const [backgroundColor, setBackgroundColor] = createSignal('#f7fcf5');
  const [textColor, setTextColor] = createSignal('#2e3b2e');
  const [secondTextColor, setSecondTextColor] = createSignal('#556b4a');
  const [sidebarColor, setSidebarColor] = createSignal('#e6f0e6');
  const [accentColor, setAccentColor] = createSignal('#aadd88');
  onMount(() => {
    loadAllThemes();
  });

  return (
    <Show when={props.isOpen}>
      <div class={styles.overlay} onClick={props.onClose}>
        <div class={styles.modal} onClick={(e) => e.stopPropagation()}>
          <h2 style={{'margin-top': 0}}>Settings</h2>
          <div class={styles.section}>
            <h3>Themes</h3>
            <div class={styles.themeGrid}>
              <For each={allThemes()}>
                {(theme) => (
                  <button
                    class={`${styles.themeButton} ${currentThemeName() === (theme.id || theme.name.toLowerCase()) ? styles.active : ''}`}
                    onClick={() => selectTheme(theme.id || theme.name.toLowerCase())}
                  >
                    <div 
                        class={styles.preview} 
                        style={{
                            'background-color': theme.backgroundColor,
                            'border': `1px solid ${theme.textColor}`
                        }}
                    >
                        <div style={{'background-color': theme.mainColor, height: '8px', width: '100%', top: 0, position: 'absolute'}}></div>
                        <div style={{'background-color': theme.sidebarColor, height: '100%', width: '15px', left: 0, position: 'absolute'}}></div>
                    </div>
                    <span>{theme.name}</span>
                  </button>
                )}
              </For>
            </div>
            <div class={styles.createRow}>
              <button
                class={styles.dataButton}
                onClick={() => setCreateOpen(!createOpen())}
              >
                <span class="material-symbols-outlined">add</span>
              </button>
            </div>
            <Show when={createOpen()}>
              <div class={styles.creator}>
                <div class={styles.creatorRow}>
                  <span>Name</span>
                  <input
                    value={newName()}
                    onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
                  />
                </div>
                <div class={styles.creatorGrid}>
                  <label>
                    <span>Main</span>
                    <input type="color" value={mainColor()} onInput={(e) => setMainColor((e.target as HTMLInputElement).value)} />
                  </label>
                  <label>
                    <span>Accent</span>
                    <input type="color" value={accentColor()} onInput={(e) => setAccentColor((e.target as HTMLInputElement).value)} />
                  </label>
                  <label>
                    <span>Background</span>
                    <input type="color" value={backgroundColor()} onInput={(e) => setBackgroundColor((e.target as HTMLInputElement).value)} />
                  </label>
                  <label>
                    <span>Sidebar</span>
                    <input type="color" value={sidebarColor()} onInput={(e) => setSidebarColor((e.target as HTMLInputElement).value)} />
                  </label>
                  <label>
                    <span>Text</span>
                    <input type="color" value={textColor()} onInput={(e) => setTextColor((e.target as HTMLInputElement).value)} />
                  </label>
                  <label>
                    <span>Text 2</span>
                    <input type="color" value={secondTextColor()} onInput={(e) => setSecondTextColor((e.target as HTMLInputElement).value)} />
                  </label>
                  <label>
                    <span>Accent 2</span>
                    <input type="color" value={color2()} onInput={(e) => setColor2((e.target as HTMLInputElement).value)} />
                  </label>
                </div>
                <div class={styles.creatorButtons}>
                  <button
                    class={styles.dataButton}
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    class={styles.dataButton}
                    onClick={async () => {
                      const baseName = newName().trim() || 'Custom theme';
                      const theme = addCustomTheme({
                        name: `[custom] ${baseName}`,
                        mainColor: mainColor(),
                        color2: color2(),
                        backgroundColor: backgroundColor(),
                        textColor: textColor(),
                        secondTextColor: secondTextColor(),
                        sidebarColor: sidebarColor(),
                        accentColor: accentColor(),
                      } as any);
                      await loadAllThemes();
                      if (theme.id) {
                        await selectTheme(theme.id);
                      }
                      setCreateOpen(false);
                    }}
                  >
                    Save theme
                  </button>
                </div>
              </div>
            </Show>
          </div>
          <div class={styles.section}>
            <h3>Data</h3>
            <div class={styles.dataRow}>
              <button
                class={styles.dataButton}
                onClick={async () => {
                  const bytes = await exportAllData();
                  const blob = new Blob([bytes], { type: 'application/octet-stream' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
                  a.href = url;
                  a.download = `simpletools-backup-${stamp}.stbundle`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                Export data
              </button>
              <label class={styles.dataButton}>
                Import data
                <input
                  type="file"
                  accept=".stbundle,application/octet-stream"
                  class={styles.fileInput}
                  onChange={async (e) => {
                    const input = e.target as HTMLInputElement;
                    if (!input.files || !input.files[0]) return;
                    const file = input.files[0];
                    const buf = await file.arrayBuffer();
                    await importAllData(new Uint8Array(buf));
                    input.value = '';
                  }}
                />
              </label>
              <button
                class={styles.dataButtonDanger}
                onClick={() => {
                  setClearText('');
                  setClearOpen(true);
                }}
              >
                Clear data
              </button>
            </div>
          </div>
          <button class={styles.closeButton} onClick={props.onClose}>Close</button>
        </div>
      </div>
      <Show when={clearOpen()}>
        <div class={styles.dangerOverlay} onClick={() => setClearOpen(false)}>
          <div class={styles.dangerModal} onClick={(e) => e.stopPropagation()}>
            <h2>Clear all data</h2>
            <p>This will remove all notebooks, pages, HTML projects, drawings, and settings.</p>
            <p>Type CLEAR ALL DATA to confirm.</p>
            <input
              class={styles.dangerInput}
              value={clearText()}
              onInput={(e) => setClearText((e.target as HTMLInputElement).value)}
              placeholder="CLEAR ALL DATA"
            />
            <div class={styles.dangerButtons}>
              <button
                class={styles.dangerCancel}
                onClick={() => {
                  setClearText('');
                  setClearOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                class={styles.dangerConfirm}
                disabled={clearText() !== 'CLEAR ALL DATA'}
                onClick={async () => {
                  if (clearText() !== 'CLEAR ALL DATA') return;
                  await clearAllData();
                  setClearText('');
                  setClearOpen(false);
                  props.onClose();
                }}
              >
                Clear everything
              </button>
            </div>
          </div>
        </div>
      </Show>
    </Show>
  );
};

