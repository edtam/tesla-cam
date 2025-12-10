import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IoPause, IoPlay } from 'react-icons/io5';
import { MdReplay } from 'react-icons/md';
import { RiForward15Fill, RiReplay15Fill } from 'react-icons/ri';

import {
  calcEventSeconds,
  calcSeekInfo,
  type CamClip,
  type CamFootage,
  type CamName,
  genLocationUrl,
  parseTime,
  type PlayerState,
  type SeekInfo,
  type ViewType,
} from '../utils';
import { IconBtn } from './IconBtn';
import { Player } from './Player';
import { Preview } from './Preview';
import { Progress } from './Progress';
import { Rate } from './Rate';

type Props = {
  clip: CamClip;
  footage: CamFootage;
};

const MAX_EXPORT_SECONDS = 60;

export function Viewer({ clip, footage }: Props) {
  const backRef = useRef<HTMLVideoElement>(null);
  const frontRef = useRef<HTMLVideoElement>(null);
  const leftRef = useRef<HTMLVideoElement>(null);
  const rightRef = useRef<HTMLVideoElement>(null);
  const backPreviewRef = useRef<HTMLVideoElement>(null);
  const frontPreviewRef = useRef<HTMLVideoElement>(null);
  const leftPreviewRef = useRef<HTMLVideoElement>(null);
  const rightPreviewRef = useRef<HTMLVideoElement>(null);
  const players = useMemo(
    () => [
      backRef,
      frontRef,
      leftRef,
      rightRef,
      backPreviewRef,
      frontPreviewRef,
      leftPreviewRef,
      rightPreviewRef,
    ],
    [],
  );

  // 播放状态
  const [statesMap, setStateMap] = useState<Record<CamName, PlayerState>>({
    back: {},
    front: {},
    left: {},
    right: {},
  });
  const handleChangeState = useCallback((key: CamName, val: PlayerState) => {
    setStateMap((s) => ({ ...s, [key]: val }));
  }, []);
  const states = useMemo(() => Object.values(statesMap), [statesMap]);

  // 片段控制
  const [segmentIndex, setSegmentIndex] = useState(0);
  const segment = footage.segments[segmentIndex];
  const isLastSegment = segmentIndex === footage.segments.length - 1;
  const isSegmentsEnded = states.every(
    (i) => i.index === segmentIndex && i.ended,
  );

  // 播放结束，跳转到下一片段
  useEffect(() => {
    if (isSegmentsEnded && !isLastSegment) {
      setSegmentIndex((i) => i + 1);
    }
  }, [isLastSegment, isSegmentsEnded]);

  // 播放进度信息
  const segmentPlayedSeconds = Math.max(
    0,
    ...states
      .filter((i) => i.index === segmentIndex)
      .map((i) => i.currentTime || 0),
  );
  const formatTime = dayjs(parseTime(segment.name))
    .add(segmentPlayedSeconds, 'second')
    .format('YYYY年MM月DD日 ddd HH:mm:ss');
  const locationText = useMemo(() => {
    if (!clip.event) {
      return '无位置信息';
    }

    const { city, street, est_lat, est_lon } = clip.event;
    const locationName = [city, street].filter(Boolean).join(' ');
    const coord = [est_lat, est_lon].filter(Boolean).join(', ');

    if (locationName && coord) {
      return `${locationName}（${coord}）`;
    }
    if (locationName) {
      return locationName;
    }
    return coord || '无位置信息';
  }, [clip.event]);
  const clipPlayedSeconds = segment.startSeconds + segmentPlayedSeconds;
  const eventSeconds = calcEventSeconds(clip, footage);
  const overlayRef = useRef({ time: formatTime, location: locationText });
  useEffect(() => {
    overlayRef.current = { time: formatTime, location: locationText };
  }, [formatTime, locationText]);

  // 播放控制
  const [playing, setPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const isClipEnded = isSegmentsEnded && isLastSegment;
  const replay = () => {
    setSegmentIndex(0);
    setPlaying(true);
  };
  const jump = (seconds: number) => {
    if (isClipEnded && seconds > 0) {
      return;
    }
    seek(clipPlayedSeconds + seconds);
  };
  const seek = (seconds: number) => {
    const res = calcSeekInfo(footage, seconds);
    if (res) {
      setSegmentIndex(res.index);
      setSeekTask(res);
    }
  };
  const handleKeyboardControl = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        setPlaying((p) => !p);
        return;
      }

      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        jump(-5);
        return;
      }

      if (event.code === 'ArrowRight') {
        event.preventDefault();
        jump(5);
      }
    },
    [jump],
  );
  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardControl);
    return () => {
      window.removeEventListener('keydown', handleKeyboardControl);
    };
  }, [handleKeyboardControl]);
  // 片段跳转完成，跳转到指定时间
  const [seekTask, setSeekTask] = useState<SeekInfo>();
  useEffect(() => {
    if (!seekTask) {
      return;
    }
    players.forEach((i) => {
      if (i.current) {
        i.current.currentTime = seekTask.seconds;
      }
    });
    setSeekTask(undefined);
  }, [players, seekTask, states]);

  const [viewType, setviewType] = useState<ViewType>('grid');
  const [exporting, setExporting] = useState(false);
  const [exportIn, setExportIn] = useState<number>();
  const [exportOut, setExportOut] = useState<number>();

  const exportSelectionSeconds = useMemo(() => {
    if (exportIn === undefined || exportOut === undefined) {
      return 0;
    }
    if (exportOut <= exportIn) {
      return 0;
    }
    return Math.min(exportOut - exportIn, footage.duration);
  }, [exportIn, exportOut, footage.duration]);

  const markExportIn = useCallback(() => {
    setExportIn(Math.min(clipPlayedSeconds, footage.duration));
  }, [clipPlayedSeconds, footage.duration]);

  const markExportOut = useCallback(() => {
    setExportOut(Math.min(clipPlayedSeconds, footage.duration));
  }, [clipPlayedSeconds, footage.duration]);

  const formatExportPoint = useCallback(
    (seconds?: number) =>
      seconds === undefined
        ? '--:--'
        : dayjs('1970-01-01T00:00:00')
            .add(seconds, 'second')
            .format('HH:mm:ss'),
    [],
  );

  const exportableSeconds = useMemo(
    () => {
      if (exportSelectionSeconds > 0) {
        return Math.min(MAX_EXPORT_SECONDS, exportSelectionSeconds);
      }

      return Math.min(
        MAX_EXPORT_SECONDS,
        Math.max(0, footage.duration - clipPlayedSeconds),
      );
    },
    [
      clipPlayedSeconds,
      exportSelectionSeconds,
      footage.duration,
    ],
  );

  const drawFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      isGrid: boolean,
    ) => {
      const drawVideo = (
        video: HTMLVideoElement | null,
        x: number,
        y: number,
        w: number,
        h: number,
      ) => {
        if (!video || video.readyState < 2) {
          return;
        }
        ctx.drawImage(video, x, y, w, h);
      };

      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);

      if (isGrid) {
        const halfW = width / 2;
        const halfH = height / 2;
        drawVideo(frontPreviewRef.current, 0, 0, halfW, halfH);
        drawVideo(leftPreviewRef.current, 0, halfH, halfW, halfH);
        drawVideo(backPreviewRef.current, halfW, 0, halfW, halfH);
        drawVideo(rightPreviewRef.current, halfW, halfH, halfW, halfH);
      } else {
        const map: Record<ViewType, HTMLVideoElement | null> = {
          grid: null,
          front: frontRef.current,
          back: backRef.current,
          left: leftRef.current,
          right: rightRef.current,
        };
        drawVideo(map[viewType], 0, 0, width, height);
      }

      const { time, location } = overlayRef.current;
      const padding = 20;
      const boxWidth = width - padding * 2;
      const boxHeight = 96;
      ctx.fillStyle = 'rgba(38,38,38,0.7)';
      ctx.fillRect(padding, padding, boxWidth, boxHeight);
      ctx.fillStyle = 'white';
      ctx.font = '32px sans-serif';
      ctx.fillText(time, padding + 16, padding + 40);
      ctx.font = '22px sans-serif';
      ctx.fillText(location, padding + 16, padding + 72);
    },
    [
      backPreviewRef,
      backRef,
      frontPreviewRef,
      frontRef,
      leftPreviewRef,
      leftRef,
      overlayRef,
      rightPreviewRef,
      rightRef,
      viewType,
    ],
  );

  const exportScreenshot = useCallback(() => {
    const canvas = document.createElement('canvas');
    const isGrid = viewType === 'grid';
    const width = 1280;
    const height = isGrid ? 960 : 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    drawFrame(ctx, width, height, isGrid);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${clip.name}-${viewType}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
      },
      'image/jpeg',
      0.92,
    );
  }, [clip.name, drawFrame, viewType]);

  const exportCurrentView = useCallback(() => {
    if (exporting) {
      return;
    }
    if (exportableSeconds <= 0) {
      return;
    }

    const exportStartSeconds =
      exportSelectionSeconds > 0 && exportIn !== undefined
        ? exportIn
        : clipPlayedSeconds;
    const seekInfo = calcSeekInfo(footage, exportStartSeconds);
    if (!seekInfo) {
      return;
    }

    setSegmentIndex(seekInfo.index);
    players.forEach((i) => {
      if (i.current) {
        i.current.currentTime = seekInfo.seconds;
      }
    });

    const exportStartTimeText = dayjs(
      parseTime(footage.segments[seekInfo.index].name),
    )
      .add(seekInfo.seconds, 'second')
      .format('YYYY年MM月DD日 ddd HH:mm:ss');
    overlayRef.current = { time: exportStartTimeText, location: locationText };

    const canvas = document.createElement('canvas');
    const isGrid = viewType === 'grid';
    const width = 1280;
    const height = isGrid ? 960 : 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const stream = canvas.captureStream(30);
    const mimeCandidates = [
      'video/mp4;codecs=H264',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm',
    ];
    const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = mimeType?.includes('mp4') || !mimeType ? 'mp4' : 'webm';
      a.download = `${clip.name}-${viewType}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
    };

    setExporting(true);
    recorder.start();
    const start = performance.now();
    const step = () => {
      const elapsed = (performance.now() - start) / 1000;
      drawFrame(ctx, width, height, isGrid);
      if (elapsed < exportableSeconds) {
        requestAnimationFrame(step);
      } else {
        recorder.stop();
      }
    };
    step();
  }, [
    backPreviewRef,
    backRef,
    clip.name,
    exportIn,
    exportSelectionSeconds,
    exporting,
    footage.duration,
    frontPreviewRef,
    frontRef,
    clipPlayedSeconds,
    leftPreviewRef,
    leftRef,
    overlayRef,
    rightPreviewRef,
    rightRef,
    exportableSeconds,
    footage.segments,
    locationText,
    viewType,
  ]);

  return (
    <div className="flex flex-1 flex-col flex-wrap items-center">
      <div className="relative grid flex-1 grid-flow-col grid-rows-2 overflow-hidden">
        <Player
          videoRef={frontPreviewRef}
          url={segment.front}
          playing={playing}
          playbackRate={playbackRate}
          full={viewType === 'front'}
        />
        <Player
          videoRef={leftPreviewRef}
          url={segment.left}
          playing={playing}
          playbackRate={playbackRate}
          full={viewType === 'left'}
        />
        <Player
          videoRef={backPreviewRef}
          url={segment.back}
          playing={playing}
          playbackRate={playbackRate}
          full={viewType === 'back'}
        />
        <Player
          videoRef={rightPreviewRef}
          url={segment.right}
          playing={playing}
          playbackRate={playbackRate}
          full={viewType === 'right'}
        />

        {/* 视频信息显示 */}
        <div className="absolute top-5 left-5 z-20 rounded-lg bg-neutral-800/70 px-4 py-2">
          <div className="text-lg">{formatTime}</div>
          <div className="text-sm text-neutral-200">{locationText}</div>
        </div>

        {/* 地点查看与导出 */}
        <div className="absolute top-5 right-5 z-20 flex flex-col gap-3 text-right">
          {clip.event && (
            <a href={genLocationUrl(clip.event)} target="_blank">
              <button className="cursor-pointer rounded-lg bg-emerald-800 px-4 py-2 hover:bg-emerald-700">
                查看位置
              </button>
            </a>
          )}
          <div className="flex gap-3 self-end">
            <button
              className="cursor-pointer rounded-lg bg-neutral-700 px-4 py-2 hover:bg-neutral-600"
              onClick={markExportIn}
            >
              设置入点
            </button>
            <button
              className="cursor-pointer rounded-lg bg-neutral-700 px-4 py-2 hover:bg-neutral-600"
              onClick={markExportOut}
            >
              设置出点
            </button>
          </div>
          <div className="text-sm text-neutral-200">
            入点：{formatExportPoint(exportIn)} 出点：{formatExportPoint(exportOut)}
            {exportableSeconds > 0 && `（${Math.round(exportableSeconds)}秒）`}
          </div>
          <div className="flex gap-3 self-end">
            <button
              className="cursor-pointer rounded-lg bg-neutral-700 px-4 py-2 hover:bg-neutral-600"
              onClick={exportScreenshot}
            >
              导出截图
            </button>
            <button
              className="cursor-pointer rounded-lg bg-blue-800 px-4 py-2 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={exportCurrentView}
              disabled={exporting || exportableSeconds <= 0}
            >
              {exporting ? '导出中…' : `导出${exportableSeconds || 0}秒`}
            </button>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="absolute right-0 bottom-0 left-0 z-20 flex flex-col gap-5 p-5 select-none">
          <div className="flex">
            <div className="flex flex-1">
              {eventSeconds && (
                <button
                  className="cursor-pointer rounded-lg bg-red-800 px-4 py-2 hover:bg-red-700"
                  onClick={() => seek(eventSeconds)}
                >
                  跳转事件
                </button>
              )}
            </div>
            <div className="flex gap-12">
              <IconBtn onClick={() => jump(-15)}>
                <RiReplay15Fill />
              </IconBtn>
              {isClipEnded ? (
                <IconBtn onClick={replay}>
                  <MdReplay />
                </IconBtn>
              ) : playing ? (
                <IconBtn onClick={() => setPlaying(false)}>
                  <IoPause />
                </IconBtn>
              ) : (
                <IconBtn onClick={() => setPlaying(true)}>
                  <IoPlay />
                </IconBtn>
              )}
              <IconBtn onClick={() => jump(15)}>
                <RiForward15Fill />
              </IconBtn>
            </div>
            <div className="flex flex-1 justify-end">
              <Rate value={playbackRate} onChange={setPlaybackRate} />
            </div>
          </div>
          <Progress
            value={clipPlayedSeconds}
            max={footage.duration}
            mark={eventSeconds}
            onChange={seek}
          />
        </div>
      </div>

      <div className="flex h-32 gap-4 p-4">
        <Preview
          name="网格"
          active={viewType === 'grid'}
          onClick={() => setviewType('grid')}
        >
          <div className="aspect-4/3 h-full bg-neutral-900 text-neutral-600">
            <div className="absolute top-1/2 w-full border-b"></div>
            <div className="absolute left-1/2 h-full border-r"></div>
          </div>
        </Preview>
        <Preview
          name="前"
          active={viewType === 'front'}
          onClick={() => setviewType('front')}
        >
          <Player
            videoRef={frontRef}
            index={segmentIndex}
            unique="front"
            url={segment.front}
            playing={playing}
            playbackRate={playbackRate}
            onChangeState={handleChangeState}
          />
        </Preview>
        <Preview
          name="后"
          active={viewType === 'back'}
          onClick={() => setviewType('back')}
        >
          <Player
            videoRef={backRef}
            index={segmentIndex}
            unique="back"
            url={segment.back}
            playing={playing}
            playbackRate={playbackRate}
            onChangeState={handleChangeState}
          />
        </Preview>
        <Preview
          name="左"
          active={viewType === 'left'}
          onClick={() => setviewType('left')}
        >
          <Player
            videoRef={leftRef}
            index={segmentIndex}
            unique="left"
            url={segment.left}
            playing={playing}
            playbackRate={playbackRate}
            onChangeState={handleChangeState}
          />
        </Preview>
        <Preview
          name="右"
          active={viewType === 'right'}
          onClick={() => setviewType('right')}
        >
          <Player
            videoRef={rightRef}
            index={segmentIndex}
            unique="right"
            url={segment.right}
            playing={playing}
            playbackRate={playbackRate}
            onChangeState={handleChangeState}
          />
        </Preview>
      </div>
    </div>
  );
}
