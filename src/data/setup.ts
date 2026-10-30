import { createProvider } from "optica-core"
import { SphaerOrthancProvider, SphaerWebProvider } from "./providers"
import { SphaerRepository } from "./sphere"

// Imported first by main.ts. The backend is the one of the environment (.env: VITE_BACKEND_TYPE, VITE_BACKEND_URL).
// Both providers replace the core ones: they add the sphaer routes.
const repository = new SphaerRepository(createProvider({
    WEB: (url) => new SphaerWebProvider(url),
    ORTHANC: (url) => new SphaerOrthancProvider(url),
}))

export function getRepository(): SphaerRepository {
    return repository
}
