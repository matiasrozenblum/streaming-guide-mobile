import React, { createContext, useContext, useState, ReactNode } from 'react';

type VideoService = 'youtube' | 'twitch' | 'kick' | null;

interface VideoPlayerContextType {
    isVisible: boolean;
    isMinimized: boolean;
    videoUrl: string | null;
    service: VideoService;
    openVideo: (url: string, service: VideoService) => void;
    closeVideo: () => void;
    minimizeVideo: () => void;
    maximizeVideo: () => void;
}

export const videoPlayerRef = React.createRef<VideoPlayerContextType>();

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

export const VideoPlayerProvider = ({ children }: { children: ReactNode }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [service, setService] = useState<VideoService>(null);

    const openVideo = (url: string, service: VideoService = 'youtube') => {
        setVideoUrl(url);
        setService(service);
        setIsVisible(true);
        setIsMinimized(false);
    };

    const closeVideo = () => {
        setIsVisible(false);
        setVideoUrl(null);
        setService(null);
    };

    const minimizeVideo = () => {
        setIsMinimized(true);
    };

    const maximizeVideo = () => {
        setIsMinimized(false);
    };

    // Expose context to global ref so non-React components (like push listeners) can use it
    React.useImperativeHandle(videoPlayerRef, () => ({
        isVisible,
        isMinimized,
        videoUrl,
        service,
        openVideo,
        closeVideo,
        minimizeVideo,
        maximizeVideo,
    }), [isVisible, isMinimized, videoUrl, service]);

    return (
        <VideoPlayerContext.Provider
            value={{
                isVisible,
                isMinimized,
                videoUrl,
                service,
                openVideo,
                closeVideo,
                minimizeVideo,
                maximizeVideo,
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
