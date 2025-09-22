export type roleType = {
    id: string;
    name: string;
    description?: string;
    created_at: Date;
    updated_at?: Date;
    created_by: string; // created user id
    updated_by: string; // current user id
    department_id: string;
    reports_to?: string; // role id
    is_archived: boolean;
    manages?: string[]; // role ids
}