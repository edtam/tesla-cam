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
  const clipPlayedSeconds = segment.startSeconds + segmentPlayedSeconds;
  const eventSeconds = calcEventSeconds(clip, footage);

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
        </div>

        {/* 地点查看 */}
        <div className="absolute top-5 right-5 z-20">
          {clip.event && (
            <a href={genLocationUrl(clip.event)} target="_blank">
              <button className="cursor-pointer rounded-lg bg-emerald-800 px-4 py-2 hover:bg-emerald-700">
                查看位置
              </button>
            </a>
          )}
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
