export type Profile = {
    id: string
    email: string
    display_name: string
    role: 'user' | 'admin' | 'developer'
    created_at: string
    updated_at: string
}

export type category = {
    id: number
    name: string
    sort_order: number
    created_at: string
}

export type Facility = {
    id: number
    name: string
    category_id: number | null
    max_capacity: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export type Reservation = {
    id: number
    user_id: string
    facility_id: number
    start_time: string
    end_time: string
    num_people: number
    purpose: string | null
    status: 'confirmed' | 'cancelled' | 'completed'
    created_at: string
    updated_at: string
}

export type ModuleSetting = {
    id: number
    module_id: string
    is_enabled: boolean
    config: Record<string, unknown>
    created_at: string
    updated_at: string
}