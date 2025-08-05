import { useEffect, useRef, useState } from 'react';

import { type CamClip, genClips } from '../utils';

type Props = {
  onChange?: (clips: CamClip[]) => void;
};

export function Start({ onChange }: Props) {
  // 兼容性判断
  const apiName = 'webkitdirectory';
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    const apiSupported = apiName in HTMLInputElement.prototype;
    setSupported(apiSupported);
  }, []);

  // 开启 文件夹读取 功能
  const inputEl = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (supported) {
      inputEl.current?.setAttribute(apiName, '');
    }
  }, [supported]);

  // 文件回调
  const [errMsg, setErrMsg] = useState('');
  const handleFiles = async (files: FileList | null) => {
    if (!files) {
      return;
    }
    const clips = await genClips(files);
    console.log('genClips', clips);
    if (clips.length) {
      onChange?.(clips);
    } else {
      setErrMsg('未匹配到有效视频文件，请重新选择');
    }
  };

  return (
    <div className="flex flex-col gap-8 p-10">
      <h2 className="text-2xl">
        特斯拉行车记录仪查看器 - Tesla Dashcam Viewer
      </h2>

      {supported ? (
        <>
          <div>
            <p className="text-neutral-400">
              请选择 TeslaCam、RecentClips、SavedClips、SentryClips 目录
            </p>
            <label>
              <input
                hidden
                ref={inputEl}
                type="file"
                multiple
                onChange={(event) => {
                  handleFiles(event.target.files);
                }}
              />
              <a className="cursor-pointer underline">选择文件夹</a>
            </label>
            <p className="text-cyan-400">{errMsg}</p>
          </div>

          <div className="text-sm text-neutral-400">
            <p>行车记录仪文件的读取分析查看均在浏览器本地运行</p>
            <p>有任何疑问或建议可通过 github issue 与我联系</p>
            <p>
              项目源码：
              <a
                href="https://github.com/edtam/tesla-cam"
                target="_blank"
                className="cursor-pointer underline"
              >
                Github
              </a>
            </p>
          </div>
        </>
      ) : (
        <p className="text-neutral-400">
          当前浏览器不支持文件夹读取功能，请使用最新版 Chrome 浏览器访问
        </p>
      )}
    </div>
  );
}
