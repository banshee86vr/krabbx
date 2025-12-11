import { Router, Request, Response, NextFunction } from 'express';
import { Octokit } from '@octokit/rest';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';

const router = Router();

// GitHub OAuth configuration
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_ORG = config.github.org;
const REQUIRED_TEAM_SLUG = 'team_cloud_and_platforms';

// Extend session type
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      login: string;
      name: string;
      email: string;
      avatar_url: string;
      accessToken: string;
    };
    oauthState?: string;
  }
}

// GET /api/auth/login - Initiate GitHub OAuth flow
router.get('/login', (req: Request, res: Response) => {
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/callback`;
  const state = Math.random().toString(36).substring(7);
  
  // Store state in session for verification
  req.session.oauthState = state;
  
  const authUrl = `${GITHUB_AUTH_URL}?` +
    `client_id=${config.auth.clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=read:org,read:user,user:email&` +
    `state=${state}`;
  
  res.redirect(authUrl);
});

// GET /api/auth/callback - Handle GitHub OAuth callback
router.get('/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query;
    
    // Verify state to prevent CSRF
    if (!state || state !== req.session.oauthState) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }
    
    // Clear the state after verification
    delete req.session.oauthState;
    
    if (!code || typeof code !== 'string') {
      throw new Error('No code provided');
    }
    
    // Exchange code for access token
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.auth.clientId,
        client_secret: config.auth.clientSecret,
        code,
      }),
    });
    
    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };
    
    if (tokenData.error || !tokenData.access_token) {
      throw new Error(`GitHub OAuth error: ${tokenData.error || 'No access token'}`);
    }
    
    const accessToken = tokenData.access_token;
    
    // Get user info
    const octokit = new Octokit({ auth: accessToken });
    const { data: user } = await octokit.users.getAuthenticated();
    
    // Check if user belongs to the required team
    const isTeamMember = await checkTeamMembership(octokit, GITHUB_ORG, REQUIRED_TEAM_SLUG);
    
    if (!isTeamMember) {
      return res.redirect(`${config.frontendUrl}/unauthorized?reason=team`);
    }
    
    // Get user emails
    const { data: emails } = await octokit.users.listEmailsForAuthenticated();
    const primaryEmail = emails.find(e => e.primary)?.email || emails[0]?.email || '';
    
    // Store user in session
    req.session.user = {
      id: user.id,
      login: user.login,
      name: user.name || user.login,
      email: primaryEmail,
      avatar_url: user.avatar_url,
      accessToken,
    };
    
    // Redirect to frontend
    res.redirect(config.frontendUrl);
  } catch (error) {
    logger.error('OAuth callback error', error);
    next(error);
  }
});

// GET /api/auth/status - Get current user status
router.get('/status', (req: Request, res: Response) => {
  if (req.session.user) {
    // Don't send the access token to the frontend
    const { accessToken, ...userWithoutToken } = req.session.user;
    res.json({ authenticated: true, user: userWithoutToken });
  } else {
    res.json({ authenticated: false, user: null });
  }
});

// POST /api/auth/logout - Logout user
router.post('/logout', (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to logout' });
      return;
    }
    res.clearCookie('sessionId'); // Match the custom session name
    res.json({ message: 'Logged out successfully' });
  });
});

// Helper function to check team membership
async function checkTeamMembership(octokit: Octokit, org: string, teamSlug: string): Promise<boolean> {
  try {
    // Check if user is a member of the specified team
    const { data: teamMembership } = await octokit.teams.getMembershipForUserInOrg({
      org,
      team_slug: teamSlug,
      username: (await octokit.users.getAuthenticated()).data.login,
    });
    
    return teamMembership.state === 'active';
  } catch (error) {
    // If we get a 404, the user is not a member
    if ((error as { status?: number }).status === 404) {
      return false;
    }
    throw error;
  }
}

export { router as authRoutes };

