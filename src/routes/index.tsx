import { createFileRoute } from "@tanstack/react-router"

import { ChannelStrip } from "#/components/channel-strip"
import { ChangelogPopover } from "#/components/changelog-popover"
import { ConfirmSharedMixDialog } from "#/components/confirm-shared-mix-dialog"
import { MasterDock } from "#/components/master-dock"
import { MeditationChimePanel } from "#/components/meditation-chime-panel"
import { NeuralModulationPanel } from "#/components/neural-modulation-panel"
import { PresetControls } from "#/components/preset-controls"
import { ShareMixButton } from "#/components/share-mix-button"
import { TrackLibrary } from "#/components/track-library"
import type { TrackId } from "#/data/tracks"
import { useFocusMixer } from "#/hooks/use-focus-mixer"
import { dismissSharedMix, usePendingSharedMix } from "#/lib/mixer-store"

export const Route = createFileRoute("/")({ component: Home })

/** Renders the complete local-first focus audio mixing desk. */
export function Home() {
  const mixer = useFocusMixer()
  const pendingSharedMix = usePendingSharedMix()
  const activeTrackIds = new Set<TrackId>(
    mixer.channels.map((channel) => channel.trackId),
  )
  const hasSoloChannel = mixer.channels.some((channel) => channel.solo)

  return (
    <div className="grid h-dvh w-full grid-rows-[auto_minmax(0,1fr)] gap-[clamp(0.65rem,1.6vh,1rem)] overflow-hidden p-[clamp(0.75rem,2vw,1.5rem)]">
      <ConfirmSharedMixDialog
        mix={pendingSharedMix}
        onApply={mixer.applySharedMix}
        onDismiss={dismissSharedMix}
      />
      <a
        className="fixed top-3 left-3 z-[100] translate-y-[-150%] rounded-[0.65rem] bg-[var(--ink)] px-4 py-3 text-[var(--surface)] transition-transform duration-100 ease-[var(--ease-out)] focus:translate-y-0"
        href="#mixer"
      >
        Skip to mixer
      </a>

      <header className="flex min-w-0 items-center gap-3">
        <MasterDock
          isPlaying={mixer.isPlaying}
          channelCount={mixer.channels.length}
          masterVolume={mixer.masterVolume}
          bpm={mixer.bpm}
          error={mixer.audioError}
          onTogglePlayback={mixer.togglePlayback}
          onMasterVolumeChange={mixer.setMasterVolume}
          onBpmChange={mixer.setBpm}
          onTapTempo={mixer.tapTempo}
        />
        <nav
          className="flex items-center justify-end gap-[0.55rem]"
          aria-label="Mixer actions"
        >
          <MeditationChimePanel
            settings={mixer.meditationChime}
            onChange={mixer.setMeditationChime}
            onPreview={mixer.previewMeditationChime}
          />
          <NeuralModulationPanel
            settings={mixer.neuralModulation}
            onChange={mixer.setNeuralModulation}
          />
          <PresetControls
            presets={mixer.presets}
            activePreset={mixer.activePreset}
            hasUnsavedChanges={mixer.hasPresetChanges}
            canSave={mixer.channels.length > 0}
            onSave={mixer.savePreset}
            onLoad={mixer.loadPreset}
            onDelete={mixer.deletePreset}
            onSaveChanges={mixer.savePresetChanges}
            onDiscardChanges={mixer.discardPresetChanges}
          />
          <ShareMixButton snapshot={mixer} />
          <TrackLibrary
            activeTrackIds={activeTrackIds}
            onPreviewPrepare={() => void mixer.preparePreview()}
            onPreviewStart={(trackId) => void mixer.startPreview(trackId)}
            onPreviewEnd={() => void mixer.stopPreview()}
            onToggleTrack={(trackId) => {
              const activeChannel = mixer.channels.find(
                (channel) => channel.trackId === trackId,
              )
              if (activeChannel) mixer.removeChannel(activeChannel.id)
              else mixer.addTrack(trackId)
            }}
          />
          <ChangelogPopover />
        </nav>
      </header>

      <main
        className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)]"
        id="mixer"
      >
        <div className="flex min-h-0 min-w-0 gap-[clamp(0.65rem,1.2vw,0.9rem)] overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-[clamp(1.2rem,2.3vw,2rem)] border border-[color-mix(in_oklch,var(--line),var(--surface)_20%)] bg-[color-mix(in_oklch,var(--paper-deep),var(--surface)_36%)] p-[clamp(0.7rem,1.4vw,1rem)] shadow-[inset_0_0.35rem_0.8rem_oklch(30%_0.01_250_/_0.12),inset_0_-1px_0_var(--surface-raised),0_0.45rem_1.2rem_oklch(30%_0.01_250_/_0.07)] [scrollbar-color:var(--line-strong)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--line-strong)]">
          {mixer.channels.map((channel, position) => (
            <ChannelStrip
              key={channel.id}
              channel={channel}
              position={position}
              isDimmed={channel.muted || (hasSoloChannel && !channel.solo)}
              onChange={mixer.updateChannel}
              onRemove={mixer.removeChannel}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
