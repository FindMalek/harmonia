/**
 * Minimal auth client interface for UI components.
 * Apps should pass their better-auth createAuthClient instance.
 */
export interface AuthClientForUI {
	useSession: () => {
		data: { user: { name?: string | null; email?: string | null } } | null;
		isPending: boolean;
	};
	signIn: {
		email: (
			params: { email: string; password: string },
			opts: {
				onSuccess?: () => void;
				onError?: (error: {
					error: { message?: string; statusText?: string };
				}) => void;
			},
		) => Promise<unknown>;
		social: (params: {
			provider: string;
			callbackURL?: string;
		}) => void;
	};
	signUp: {
		email: (
			params: { email: string; password: string; name: string },
			opts: {
				onSuccess?: () => void;
				onError?: (error: {
					error: { message?: string; statusText?: string };
				}) => void;
			},
		) => Promise<unknown>;
	};
	signOut: (opts?: {
		fetchOptions?: { onSuccess?: () => void };
	}) => void;
}
