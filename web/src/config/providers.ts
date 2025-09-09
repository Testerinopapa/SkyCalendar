export type ProviderConfig = {
	baseUrl: string;
	timeoutMs: number;
	rateLimitPerMin?: number;
	enabled: boolean;
};

export const providers = {
	nasa: {
		baseUrl: "https://api.nasa.gov",
		timeoutMs: 10000,
		enabled: true,
	} as ProviderConfig,
	launchLibrary: {
		baseUrl: "https://ll.thespacedevs.com/2.2.0",
		timeoutMs: 10000,
		enabled: true,
	} as ProviderConfig,
};
