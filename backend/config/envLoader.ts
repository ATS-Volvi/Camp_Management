import dotenv from 'dotenv'
dotenv.config()

const ENV = [
    "PGHOST",
    "PGPORT",
    "PGUSER",
    "PGPASSWORD",
    "PGDATABASE",
    "DATABASE_URL",
    "JWT_SECRET",
    "PORT",
    "CORS_ALLOW_ORIGIN"
] as const

const loadVar = (env: readonly string[]): Record<string, string> => {
    const variables: Record<string, string> = {}
    env.forEach(name => {
        const value = process.env[name]
        if (value) {
            variables[name] = value
        } else {
            // Some might be optional, but we log for tracking
            console.warn(`Env ${name} not found`)
        }
    })
    return variables
}

export const variables: Record<(typeof ENV)[number], string> = loadVar(ENV as unknown as string[]) as any
