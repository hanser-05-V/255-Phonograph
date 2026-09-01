import {useEffect, useState} from 'react';

const BAR_COUNT = 64;
const HALF_BAR_COUNT = BAR_COUNT / 2;

type SpectrumGraph = {
  analyser: AnalyserNode;
  context: AudioContext;
  frequencyData: Uint8Array<ArrayBuffer>;
  source: MediaElementAudioSourceNode;
};

const graphsByAudio = new WeakMap<HTMLAudioElement, Promise<SpectrumGraph | null>>();

async function createSpectrumGraph(audio: HTMLAudioElement): Promise<SpectrumGraph | null> {
  let context: AudioContext | null = null;
  let source: MediaElementAudioSourceNode | null = null;

  try {
    context = new AudioContext();
    await context.resume();
    source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);
    analyser.connect(context.destination);

    return {
      analyser,
      context,
      frequencyData: new Uint8Array(analyser.frequencyBinCount),
      source,
    };
  } catch {
    if (source && context) {
      try {
        source.connect(context.destination);
      } catch {
        // The audio element remains under the player's control when Web Audio is unavailable.
      }
    }
    return null;
  }
}

function getSpectrumGraph(audio: HTMLAudioElement) {
  const cached = graphsByAudio.get(audio);
  if (cached) {
    return cached;
  }

  const graph = createSpectrumGraph(audio);
  graphsByAudio.set(audio, graph);
  return graph;
}

const mirrorFrequencyData = (frequencyData: Uint8Array) =>
  Array.from({length: BAR_COUNT}, (_, index) => {
    const mirroredIndex = index < HALF_BAR_COUNT
      ? HALF_BAR_COUNT - index - 1
      : index - HALF_BAR_COUNT;
    return frequencyData[mirroredIndex] ?? 0;
  });

type SpectrumProps = {
  audio: HTMLAudioElement | null;
  isPlaying: boolean;
};

export function Spectrum({audio, isPlaying}: SpectrumProps) {
  const [levels, setLevels] = useState(() => Array<number>(BAR_COUNT).fill(0));
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    if (!audio || !isPlaying) {
      return;
    }

    let cancelled = false;
    let frameId: number | null = null;

    void getSpectrumGraph(audio).then((graph) => {
      if (cancelled) {
        return;
      }
      if (!graph) {
        setIsUnavailable(true);
        return;
      }

      setIsUnavailable(false);
      const sample = () => {
        if (cancelled) {
          return;
        }

        graph.analyser.getByteFrequencyData(graph.frequencyData);
        setLevels(mirrorFrequencyData(graph.frequencyData));
        frameId = requestAnimationFrame(sample);
      };
      sample();
    });

    return () => {
      cancelled = true;
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [audio, isPlaying]);

  if (isUnavailable) {
    return null;
  }

  return (
    <div aria-hidden="true" className="spectrum" data-testid="spectrum">
      {levels.map((level, index) => (
        <span
          className="spectrum__bar"
          key={index}
          style={{transform: `scaleY(${Math.max(0.08, level / 255)})`}}
        />
      ))}
    </div>
  );
}
