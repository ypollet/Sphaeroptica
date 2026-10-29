import { ProviderFactory, RepositoryFactory } from "optica-core"
import { SphaerOrthancProvider, SphaerWebProvider, type SphaerProvider } from "./providers"
import { SphaerRepository } from "./sphere"

// Imported first by main.ts: the stores and components get the repository from the factories.
// Both providers replace the core ones: they add the sphaer routes.
ProviderFactory.register("WEB", (url) => new SphaerWebProvider(url))
ProviderFactory.register("ORTHANC", (url) => new SphaerOrthancProvider(url))
RepositoryFactory.register("DATA", (provider) => new SphaerRepository(provider as SphaerProvider))

export function getRepository(): SphaerRepository {
    return RepositoryFactory.get<SphaerRepository>()
}
