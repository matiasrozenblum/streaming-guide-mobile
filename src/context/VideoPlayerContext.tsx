import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ZapItem } from '../types/zap';

type VideoService = 'youtube' | 'twitch' | 'kick' | null;

interface OpenVideoOptions {
    zapList?: ZapItem[];
    zapIndex?: number;
}

interface VideoPlayerContextType {
    isVisible: boolean;
    isMinimized: boolean;
    videoUrl: string | null;
    service: VideoService;
    zapList: ZapItem[];
    zapIndex: number;
    canZapNext: boolean;
    canZapPrevious: boolean;
    openVideo: (url: string, service: VideoService, options?: OpenVideoOptions) => void;
    closeVideo: () => void;
    minimizeVideo: () => void;
    maximizeVideo: () => void;
    zapTo: (index: number) => void;
}

export const videoPlayerRef = React.createRef<VideoPlayerContextType>();

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

export const VideoPlayerProvider = ({ children }: { children: ReactNode }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [service, setService] = useState<VideoService>(null);
    const [zapList, setZapList] = useState<ZapItem[]>([]);
    const [zapIndex, setZapIndex] = useState(0);

    const canZapPrevious = zapList.length > 0 && zapIndex > 0;
    const canZapNext = zapList.length > 0 && zapIndex < zapList.length - 1;

    const openVideo = (url: string, svc: VideoService, options?: OpenVideoOptions) => {
        setVideoUrl(url);
        setService(svc);
        setIsVisible(true);
        setIsMinimized(false);
        if (options?.zapList) {
            setZapList(options.zapList);
            setZapIndex(options.zapIndex ?? 0);
        } else {
            setZapList([]);
            setZapIndex(0);
        }
    };

    const zapTo = (index: number) => {
        if (index < 0 || index >= zapList.length) return;
        const item = zapList[index];
        if (!item.videoUrl) return;
        setZapIndex(index);
        setVideoUrl(item.videoUrl);
        setService(item.service);
    };

    const closeVideo = () => {
        setIsVisible(false);
        setVideoUrl(null);
        setService(null);
        setZapList([]);
        setZapIndex(0);
    };

    const minimizeVideo = () => {
        setIsMinimized(true);
    };

    const maximizeVideo = () => {
        setIsMinimized(false);
    };

    React.useImperativeHandle(videoPlayerRef, () => ({
        isVisible,
        isMinimized,
        videoUrl,
        service,
        zapList,
        zapIndex,
        canZapNext,
        canZapPrevious,
        openVideo,
        closeVideo,
        minimizeVideo,
        maximizeVideo,
        zapTo,
    }), [isVisible, isMinimized, videoUrl, service, zapList, zapIndex, canZapNext, canZapPrevious]);

    return (
        <VideoPlayerContext.Provider
            value={{
                isVisible,
                isMinimized,
                videoUrl,
                service,
                zapList,
                zapIndex,
                canZapNext,
                canZapPrevious,
                openVideo,
                closeVideo,
                minimizeVideo,
                maximizeVideo,
                zapTo,
            }}
        >
            {children}
        </VideoPlayerContext.Provider>
    );
};

export const useVideoPlayer = () => {
    const context = useContext(VideoPlayerContext);
    if (!context) {
        throw new Error('useVideoPlayer must be used within a VideoPlayerProvider');
    }
    return context;
};
