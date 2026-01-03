export interface Procedure {
    id: string;
    name: string;
    category: string;
    price: number;
    duration_minutes: number;
    description: string | null;
    is_package: boolean;
    image_url: string | null;
}

export interface Appointment {
    id: string;
    client_name: string;
    client_phone: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'manual_fit';
    procedure_id: string;
    created_at: string;
    procedure?: Procedure; // Join
}
