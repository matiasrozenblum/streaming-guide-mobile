export enum LinkType {
    INTERNAL = 'internal',
    EXTERNAL = 'external',
    NONE = 'none',
}

export enum BannerType {
    NEWS = 'news',
    PROMOTIONAL = 'promotional',
    FEATURED = 'featured',
}

export interface Banner {
    id: number;
    title: string;
    description?: string | null;
    image_url: string;
    image_url_desktop?: string | null;
    image_url_mobile?: string | null;
    link_type: LinkType;
    link_url?: string | null;
    is_enabled: boolean;
    start_date?: string | null;
    end_date?: string | null;
    display_order: number;
    is_fixed: boolean;
    priority: number;
    banner_type: BannerType;
    created_at: string;
    updated_at: string;
}
