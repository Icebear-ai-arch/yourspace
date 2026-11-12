import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, request } from './api';
import './App.css';

function ThemeToggle({ theme, onToggle }) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      aria-label={`Switch to ${nextTheme} mode`}
      className="theme-toggle"
      onClick={onToggle}
      type="button"
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
      {nextTheme === 'light' ? 'Light mode' : 'Dark mode'}
    </button>
  );
}

function MediaPicker({ file, onChange }) {
  return (
    <div className="media-picker">
      <label className="attachment-button">
        <span aria-hidden="true">＋</span> Add image or video
        <input
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
          onChange={event => {
            onChange(event.target.files[0] || null);
            event.target.value = '';
          }}
          type="file"
        />
      </label>
      {file && (
        <span className="attachment-name">
          {file.name}
          <button aria-label="Remove attachment" className="text-button" onClick={() => onChange(null)} type="button">Remove</button>
        </span>
      )}
    </div>
  );
}

function MediaPreview({ mediaType, mediaUrl, mediaName }) {
  if (!mediaUrl) return null;
  const source = `${API_URL}${mediaUrl}`;

  if (mediaType?.startsWith('video/')) {
    return <video className="media-preview" controls crossOrigin="use-credentials" preload="metadata" src={source} />;
  }
  return <img alt={mediaName || 'Post attachment'} className="media-preview" crossOrigin="use-credentials" loading="lazy" src={source} />;
}

function Avatar({ username, profilePictureUrl, className = '' }) {
  const label = username ? `${username}'s profile picture` : 'Profile picture';
  return (
    <div aria-label={label} className={`avatar ${className}`.trim()} role="img">
      {username?.slice(0, 1).toUpperCase() || '?'}
      {profilePictureUrl
        ? <img alt="" crossOrigin="use-credentials" src={`${API_URL}${profilePictureUrl}`} />
        : null}
    </div>
  );
}

function AuthScreen({ onAuthenticated, theme, onThemeToggle }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await request(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });
      onAuthenticated(data.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card-top">
          <div className="brand-mark">Y</div>
          <ThemeToggle onToggle={onThemeToggle} theme={theme} />
        </div>
        <p className="eyebrow">YOUR PEOPLE, YOUR PLACE</p>
        <h1>{mode === 'login' ? 'Welcome back' : 'Join the conversation'}</h1>
        <p className="muted">
          {mode === 'login' ? 'Sign in to catch up with your community.' : 'Create an account to share and connect.'}
        </p>
        <form className="stack-form" onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Display name
              <input
                autoComplete="nickname"
                maxLength="40"
                minLength="3"
                onChange={event => setUsername(event.target.value)}
                required
                value={username}
              />
            </label>
          )}
          <label>
            Email
            <input
              autoComplete="email"
              onChange={event => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength="8"
              onChange={event => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="primary-button" disabled={busy} type="submit">
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="switch-auth">
          {mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
          <button
            className="text-button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            type="button"
          >
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </section>
    </main>
  );
}

function ProfileSettings({ user, onUpdated, onDeleted }) {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [pictureBusy, setPictureBusy] = useState(false);

  useEffect(() => {
    setUsername(user.username);
    setEmail(user.email);
  }, [user]);

  async function saveProfile(event) {
    event.preventDefault();
    setNotice('');
    setError('');
    try {
      const data = await request('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ username, email }),
      });
      onUpdated(data.user);
      setNotice('Profile saved.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function uploadProfilePicture(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;

    setNotice('');
    setError('');
    setPictureBusy(true);
    try {
      const body = new FormData();
      body.append('profilePicture', file);
      const data = await request('/auth/profile-picture', { method: 'PATCH', body });
      onUpdated(data.user);
      setNotice('Profile picture updated.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPictureBusy(false);
    }
  }

  async function removeProfilePicture() {
    setNotice('');
    setError('');
    setPictureBusy(true);
    try {
      const data = await request('/auth/profile-picture', { method: 'DELETE' });
      onUpdated(data.user);
      setNotice('Profile picture removed.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPictureBusy(false);
    }
  }

  async function deleteAccount() {
    if (!window.confirm('Delete your account and its posts, comments, and messages? This cannot be undone.')) {
      return;
    }
    setError('');
    try {
      await request('/auth/account', { method: 'DELETE' });
      onDeleted();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <details className="profile-settings">
      <summary>Account settings</summary>
      <form className="stack-form compact-form" onSubmit={saveProfile}>
        <div className="profile-picture-tools">
          <Avatar className="profile-picture-preview" profilePictureUrl={user.profilePictureUrl} username={user.username} />
          <div className="profile-picture-controls">
            <label className="attachment-button">
              {pictureBusy ? 'Updating…' : 'Change photo'}
              <input
                accept="image/jpeg,image/png,image/gif,image/webp"
                disabled={pictureBusy}
                onChange={uploadProfilePicture}
                type="file"
              />
            </label>
            {user.profilePictureUrl && (
              <button className="text-button" disabled={pictureBusy} onClick={removeProfilePicture} type="button">
                Remove
              </button>
            )}
            <small>JPG, PNG, GIF, or WEBP · max 5 MB</small>
          </div>
        </div>
        <label>
          Display name
          <input maxLength="40" minLength="3" onChange={event => setUsername(event.target.value)} required value={username} />
        </label>
        <label>
          Email
          <input onChange={event => setEmail(event.target.value)} required type="email" value={email} />
        </label>
        {notice && <p className="success-message">{notice}</p>}
        {error && <p className="error-message" role="alert">{error}</p>}
        <button className="secondary-button" type="submit">Save profile</button>
        <button className="danger-link" onClick={deleteAccount} type="button">Delete account</button>
      </form>
    </details>
  );
}

function PostCard({ post, user, onRefresh }) {
  const [editingPost, setEditingPost] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [postText, setPostText] = useState(post.postText);
  const [mediaFile, setMediaFile] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [error, setError] = useState('');
  const isOwner = post.userId === user.id;

  async function updatePost(event) {
    event.preventDefault();
    setError('');
    try {
      const body = new FormData();
      body.append('title', title);
      body.append('postText', postText);
      if (mediaFile) body.append('media', mediaFile);
      await request(`/posts/${post.id}`, {
        method: 'PATCH',
        body,
      });
      setEditingPost(false);
      setMediaFile(null);
      await onRefresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deletePost() {
    if (!window.confirm('Delete this post and its comments?')) {
      return;
    }
    setError('');
    try {
      await request(`/posts/${post.id}`, { method: 'DELETE' });
      await onRefresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function addComment(event) {
    event.preventDefault();
    setError('');
    try {
      await request(`/comments/posts/${post.id}`, {
        method: 'POST',
        body: JSON.stringify({ body: commentText }),
      });
      setCommentText('');
      await onRefresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function saveComment(event, commentId) {
    event.preventDefault();
    setError('');
    try {
      await request(`/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ body: commentDraft }),
      });
      setEditingComment(null);
      await onRefresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteComment(commentId) {
    setError('');
    try {
      await request(`/comments/${commentId}`, { method: 'DELETE' });
      await onRefresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <article className="post-card">
      <div className="post-heading">
        <Avatar profilePictureUrl={post.author?.profilePictureUrl} username={post.author?.username || post.username} />
        <div className="post-byline">
          <strong>{post.author?.username || post.username || 'Community member'}</strong>
          <span>{new Date(post.createdAt).toLocaleString()}</span>
        </div>
        {isOwner && (
          <div className="post-actions">
            <button className="text-button" onClick={() => setEditingPost(!editingPost)} type="button">
              {editingPost ? 'Cancel' : 'Edit'}
            </button>
            <button className="danger-link" onClick={deletePost} type="button">Delete</button>
          </div>
        )}
      </div>

      {editingPost ? (
        <form className="stack-form edit-form" onSubmit={updatePost}>
          <input aria-label="Post title" maxLength="255" onChange={event => setTitle(event.target.value)} value={title} />
          <textarea aria-label="Post text" maxLength="255" onChange={event => setPostText(event.target.value)} value={postText} />
          <MediaPicker file={mediaFile} onChange={setMediaFile} />
          {post.mediaUrl && <p className="form-hint">Choose a file above to replace the current attachment.</p>}
          <button className="primary-button small-button" type="submit">Save changes</button>
        </form>
      ) : (
        <div className="post-content">
          {post.title && post.title !== 'Post' && <h3>{post.title}</h3>}
          {post.postText && <p>{post.postText}</p>}
          <MediaPreview mediaName={post.mediaName} mediaType={post.mediaType} mediaUrl={post.mediaUrl} />
        </div>
      )}

      {error && <p className="error-message" role="alert">{error}</p>}

      <div className="comments">
        <p className="comments-label">{post.comments?.length || 0} comments</p>
        {(post.comments || []).map(comment => (
          <div className="comment-row" key={comment.id}>
            <Avatar className="avatar-small" profilePictureUrl={comment.author?.profilePictureUrl} username={comment.author?.username} />
            <div className="comment-body">
              <div className="comment-bubble">
                <strong>{comment.author?.username || 'Community member'}</strong>
                {editingComment === comment.id ? (
                  <form className="inline-edit" onSubmit={event => saveComment(event, comment.id)}>
                    <input maxLength="1000" onChange={event => setCommentDraft(event.target.value)} required value={commentDraft} />
                    <button className="text-button" type="submit">Save</button>
                    <button className="text-button" onClick={() => setEditingComment(null)} type="button">Cancel</button>
                  </form>
                ) : <p>{comment.body}</p>}
              </div>
              {comment.userId === user.id && editingComment !== comment.id && (
                <div className="comment-actions">
                  <button
                    className="text-button"
                    onClick={() => {
                      setEditingComment(comment.id);
                      setCommentDraft(comment.body);
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button className="text-button" onClick={() => deleteComment(comment.id)} type="button">Delete</button>
                </div>
              )}
            </div>
          </div>
        ))}
        <form className="comment-form" onSubmit={addComment}>
          <Avatar className="avatar-small" profilePictureUrl={user.profilePictureUrl} username={user.username} />
          <input
            aria-label="Write a comment"
            maxLength="1000"
            onChange={event => setCommentText(event.target.value)}
            placeholder="Write a comment…"
            required
            value={commentText}
          />
          <button className="text-button" disabled={!commentText.trim()} type="submit">Send</button>
        </form>
      </div>
    </article>
  );
}

function Feed({ user }) {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [postText, setPostText] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadPosts() {
    const data = await request('/posts');
    setPosts(data);
  }

  useEffect(() => {
    loadPosts().catch(requestError => setError(requestError.message));
  }, []);

  async function createPost(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('title', title);
      body.append('postText', postText);
      if (mediaFile) body.append('media', mediaFile);
      await request('/posts', {
        method: 'POST',
        body,
      });
      setTitle('');
      setPostText('');
      setMediaFile(null);
      await loadPosts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="feed-column">
      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR COMMUNITY</p>
          <h1>Home feed</h1>
        </div>
      </div>
      <form className="composer card" onSubmit={createPost}>
        <div className="composer-heading">
          <Avatar profilePictureUrl={user.profilePictureUrl} username={user.username} />
          <span>Share something with your community</span>
        </div>
        <input
          aria-label="Post title"
          maxLength="255"
          onChange={event => setTitle(event.target.value)}
          placeholder="Add a title (optional)"
          value={title}
        />
        <textarea
          aria-label="Post text"
          maxLength="255"
          onChange={event => setPostText(event.target.value)}
          placeholder="What’s on your mind?"
          value={postText}
        />
        <MediaPicker file={mediaFile} onChange={setMediaFile} />
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="composer-footer">
          <span className="muted">{postText.length}/255</span>
          <button className="primary-button small-button" disabled={busy || (!postText.trim() && !mediaFile)} type="submit">
            {busy ? 'Posting…' : 'Publish post'}
          </button>
        </div>
      </form>
      {posts.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">✳</div>
          <h2>Your feed starts here</h2>
          <p>Share a post or start a conversation with someone in your community.</p>
        </div>
      ) : (
        <div className="post-list">
          {posts.map(post => <PostCard key={post.id} onRefresh={loadPosts} post={post} user={user} />)}
        </div>
      )}
    </section>
  );
}

function FriendsPage() {
  const [people, setPeople] = useState([]);
  const [friendData, setFriendData] = useState({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
  });
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const refresh = useCallback(async () => {
    const [userList, data] = await Promise.all([request('/users'), request('/friends')]);
    setPeople(userList);
    setFriendData(data);
  }, []);

  useEffect(() => {
    let active = true;
    const refreshAndReport = () => refresh().catch(requestError => {
      if (active) setError(requestError.message);
    });
    refreshAndReport();

    const connection = io(API_URL, { withCredentials: true });
    connection.on('friend:request:new', refreshAndReport);
    connection.on('friend:request:accepted', refreshAndReport);
    connection.on('friend:request:updated', refreshAndReport);
    connection.on('connect_error', connectionError => setError(connectionError.message));

    return () => {
      active = false;
      connection.disconnect();
    };
  }, [refresh]);

  const relatedUserIds = new Set([
    ...friendData.friends.map(friend => friend.id),
    ...friendData.incomingRequests.map(request => request.user.id),
    ...friendData.outgoingRequests.map(request => request.user.id),
  ]);
  const searchResults = people.filter(person => (
    !relatedUserIds.has(person.id)
    && person.username.toLowerCase().includes(search.trim().toLowerCase())
  ));

  async function sendRequest(person) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await request('/friends/requests', {
        method: 'POST',
        body: JSON.stringify({ userId: person.id }),
      });
      setNotice(`Friend request sent to ${person.username}.`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function acceptRequest(requestId) {
    setError('');
    try {
      await request(`/friends/requests/${requestId}/accept`, { method: 'POST' });
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function declineRequest(requestId) {
    setError('');
    try {
      await request(`/friends/requests/${requestId}`, { method: 'DELETE' });
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function removeFriend(friend) {
    if (!window.confirm(`Remove ${friend.username} from your friends?`)) return;
    setError('');
    try {
      await request(`/friends/${friend.id}`, { method: 'DELETE' });
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="friends-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR COMMUNITY</p>
          <h1>Friends</h1>
        </div>
      </div>
      {error && <p className="error-message friends-error" role="alert">{error}</p>}
      {notice && <p className="success-message friends-notice" role="status">{notice}</p>}

      <div className="friends-grid">
        <section className="friend-section card">
          <h2>Friend requests <span>{friendData.incomingRequests.length}</span></h2>
          {friendData.incomingRequests.length === 0 ? (
            <p className="muted friend-empty">No incoming requests right now.</p>
          ) : friendData.incomingRequests.map(item => (
            <div className="friend-row" key={item.requestId}>
              <Avatar className="avatar-small" profilePictureUrl={item.user.profilePictureUrl} username={item.user.username} />
              <strong>{item.user.username}</strong>
              <div className="friend-actions">
                <button className="secondary-button" onClick={() => acceptRequest(item.requestId)} type="button">Accept</button>
                <button className="text-button" onClick={() => declineRequest(item.requestId)} type="button">Decline</button>
              </div>
            </div>
          ))}
        </section>

        <section className="friend-section card">
          <h2>Your friends <span>{friendData.friends.length}</span></h2>
          {friendData.friends.length === 0 ? (
            <p className="muted friend-empty">Send a request and your friends will show up here.</p>
          ) : friendData.friends.map(friend => (
            <div className="friend-row" key={friend.id}>
              <Avatar className="avatar-small" profilePictureUrl={friend.profilePictureUrl} username={friend.username} />
              <strong>{friend.username}</strong>
              <div className="friend-actions">
                <button className="danger-link" onClick={() => removeFriend(friend)} type="button">Remove</button>
              </div>
            </div>
          ))}
        </section>

        <section className="friend-section card sent-requests">
          <h2>Sent requests <span>{friendData.outgoingRequests.length}</span></h2>
          {friendData.outgoingRequests.length === 0 ? (
            <p className="muted friend-empty">Requests you send will appear here.</p>
          ) : friendData.outgoingRequests.map(item => (
            <div className="friend-row" key={item.requestId}>
              <Avatar className="avatar-small" profilePictureUrl={item.user.profilePictureUrl} username={item.user.username} />
              <strong>{item.user.username}</strong>
              <div className="friend-actions">
                <button className="text-button" onClick={() => declineRequest(item.requestId)} type="button">Cancel</button>
              </div>
            </div>
          ))}
        </section>

        <section className="friend-section card find-friends">
          <h2>Find people</h2>
          <input
            aria-label="Search people by name"
            onChange={event => setSearch(event.target.value)}
            placeholder="Search by display name"
            value={search}
          />
          <div className="friend-search-results">
            {searchResults.map(person => (
              <div className="friend-row" key={person.id}>
                <Avatar className="avatar-small" profilePictureUrl={person.profilePictureUrl} username={person.username} />
                <strong>{person.username}</strong>
                <div className="friend-actions">
                  <button className="secondary-button" disabled={busy} onClick={() => sendRequest(person)} type="button">
                    Add friend
                  </button>
                </div>
              </div>
            ))}
            {searchResults.length === 0 && (
              <p className="muted friend-empty">
                {people.length === 0 ? 'No other accounts yet.' : 'No new people match your search.'}
              </p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function Chat({ user }) {
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([request('/friends'), request('/chat/conversations')])
      .then(([friendData, conversationList]) => {
        if (active) {
          setUsers(friendData.friends);
          setConversations(conversationList);
        }
      })
      .catch(requestError => {
        if (active) setError(requestError.message);
      });

    const connection = io(API_URL, { withCredentials: true });
    connection.on('connect_error', connectionError => setError(connectionError.message));
    connection.on('chat:error', payload => setError(payload.error));
    connection.on('message:new', message => {
      setMessages(current => (
        current.some(item => item.id === message.id) ? current : [...current, message]
      ));
      setConversations(current => current.map(conversation => (
        conversation.id === message.conversationId
          ? { ...conversation, messages: [message], updatedAt: message.createdAt }
          : conversation
      )));
    });
    setSocket(connection);

    return () => {
      active = false;
      connection.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!selected || !socket) {
      setMessages([]);
      return undefined;
    }

    let active = true;
    setMediaFile(null);
    setError('');
    socket.emit('conversation:join', selected.id);
    request(`/chat/conversations/${selected.id}/messages`)
      .then(data => {
        if (active) setMessages(data);
      })
      .catch(requestError => {
        if (active) setError(requestError.message);
      });

    return () => {
      active = false;
      socket.emit('conversation:leave', selected.id);
    };
  }, [selected, socket]);

  async function startConversation(otherUserId) {
    setError('');
    try {
      const conversation = await request('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ userId: otherUserId }),
      });
      setConversations(current => (
        current.some(item => item.id === conversation.id) ? current : [conversation, ...current]
      ));
      setSelected(conversation);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!selected || (!draft.trim() && !mediaFile)) return;
    setError('');
    try {
      const body = new FormData();
      body.append('content', draft);
      if (mediaFile) body.append('media', mediaFile);
      const message = await request(`/chat/conversations/${selected.id}/messages`, {
        method: 'POST',
        body,
      });
      setMessages(current => (
        current.some(item => item.id === message.id) ? current : [...current, message]
      ));
      setDraft('');
      setMediaFile(null);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function otherParticipant(conversation) {
    if (conversation.participantOne?.id === user.id) return conversation.participantTwo;
    return conversation.participantOne;
  }

  return (
    <section className="chat-panel">
      <div className="chat-title">
        <div>
          <p className="eyebrow">SAY HELLO</p>
          <h2>Messages</h2>
        </div>
        <span className="online-indicator" title="Live messaging enabled" />
      </div>
      <label className="new-chat-label" htmlFor="new-chat">Message a friend</label>
      <select id="new-chat" onChange={event => event.target.value && startConversation(Number(event.target.value))} value="">
        <option value="">{users.length ? 'Choose a friend…' : 'Add friends first…'}</option>
        {users.map(person => <option key={person.id} value={person.id}>{person.username}</option>)}
      </select>

      <div className="conversation-list">
        {conversations.map(conversation => {
          const person = otherParticipant(conversation);
          if (!person) return null;
          const lastMessage = conversation.messages?.[0];
          return (
            <button
              className={`conversation-item${selected?.id === conversation.id ? ' selected' : ''}`}
              key={conversation.id}
              onClick={() => setSelected(conversation)}
              type="button"
            >
              <Avatar profilePictureUrl={person.profilePictureUrl} username={person.username} />
              <span className="conversation-copy">
                <strong>{person.username}</strong>
                <small>{lastMessage ? (lastMessage.content || (lastMessage.mediaType ? 'Attachment' : 'Start chatting')) : 'Start chatting'}</small>
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="error-message chat-error" role="alert">{error}</p>}
      {selected ? (
        <div className="active-chat">
          <div className="active-chat-heading">
            <Avatar className="avatar-small" profilePictureUrl={otherParticipant(selected)?.profilePictureUrl} username={otherParticipant(selected)?.username} />
            <strong>{otherParticipant(selected)?.username || 'Conversation'}</strong>
          </div>
          <div aria-live="polite" className="chat-messages">
            {messages.map(message => (
              <div className={`message-bubble${message.userId === user.id ? ' own-message' : ''}`} key={message.id}>
                {message.userId !== user.id && <small>{message.author?.username}</small>}
                {message.content && <p>{message.content}</p>}
                <MediaPreview mediaName={message.mediaName} mediaType={message.mediaType} mediaUrl={message.mediaUrl} />
                <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
              </div>
            ))}
            {messages.length === 0 && <p className="muted chat-empty">Say hello to start the conversation.</p>}
          </div>
          <MediaPicker file={mediaFile} onChange={setMediaFile} />
          <form className="message-form" onSubmit={sendMessage}>
            <input
              aria-label="Write a message"
              maxLength="4000"
              onChange={event => setDraft(event.target.value)}
              placeholder="Write a message…"
              value={draft}
            />
            <button aria-label="Send message" className="send-button" disabled={!draft.trim() && !mediaFile} type="submit">↑</button>
          </form>
        </div>
      ) : (
        <div className="chat-placeholder">
          <span>↗</span>
          <p>Choose a conversation or find someone new.</p>
        </div>
      )}
    </section>
  );
}

function GroupsPage({ user }) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [memberIds, setMemberIds] = useState([]);
  const [draft, setDraft] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [renameName, setRenameName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const activeGroupId = useRef(null);

  useEffect(() => {
    activeGroupId.current = activeGroup ? activeGroup.id : null;
  }, [activeGroup]);

  useEffect(() => {
    let active = true;
    Promise.all([request('/friends'), request('/groups')])
      .then(([friendData, groupList]) => {
        if (active) {
          setUsers(friendData.friends);
          setGroups(groupList);
          setActiveGroup(current => current || groupList[0] || null);
        }
      })
      .catch(requestError => {
        if (active) setError(requestError.message);
      });

    const connection = io(API_URL, { withCredentials: true });
    connection.on('connect_error', connectionError => setError(connectionError.message));
    connection.on('group:error', payload => setError(payload.error));
    connection.on('group:created', group => {
      setGroups(current => (
        current.some(item => item.id === group.id) ? current : [group, ...current]
      ));
      setActiveGroup(current => current || group);
    });
    connection.on('group:renamed', group => {
      setGroups(current => current.map(item => item.id === group.id ? group : item));
      setActiveGroup(current => current?.id === group.id ? group : current);
    });
    connection.on('group:message:new', message => {
      setMessages(current => (
        current.some(item => item.id === message.id) || activeGroupId.current !== message.groupId
          ? current
          : [...current, message]
      ));
      setGroups(current => current.map(group => (
        group.id === message.groupId
          ? { ...group, messages: [message], updatedAt: message.createdAt }
          : group
      )));
    });
    setSocket(connection);

    return () => {
      active = false;
      connection.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!activeGroup || !socket) {
      setMessages([]);
      return undefined;
    }

    let active = true;
    setMediaFile(null);
    setError('');
    socket.emit('group:join', activeGroup.id);
    request(`/groups/${activeGroup.id}/messages`)
      .then(data => {
        if (active) setMessages(data);
      })
      .catch(requestError => {
        if (active) setError(requestError.message);
      });

    return () => {
      active = false;
      socket.emit('group:leave', activeGroup.id);
    };
  }, [activeGroup, socket]);

  async function createGroup(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const group = await request('/groups', {
        method: 'POST',
        body: JSON.stringify({ name: groupName, memberIds }),
      });
      setGroups(current => (
        current.some(item => item.id === group.id) ? current : [group, ...current]
      ));
      setActiveGroup(group);
      setGroupName('');
      setMemberIds([]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function renameGroup(event) {
    event.preventDefault();
    if (!activeGroup) return;
    setError('');
    try {
      const group = await request(`/groups/${activeGroup.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: renameName }),
      });
      setGroups(current => current.map(item => item.id === group.id ? group : item));
      setActiveGroup(group);
      setIsRenaming(false);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!activeGroup || (!draft.trim() && !mediaFile)) return;
    setError('');
    try {
      const body = new FormData();
      body.append('content', draft);
      if (mediaFile) body.append('media', mediaFile);
      const message = await request(`/groups/${activeGroup.id}/messages`, {
        method: 'POST',
        body,
      });
      setMessages(current => (
        current.some(item => item.id === message.id) ? current : [...current, message]
      ));
      setGroups(current => current.map(group => (
        group.id === message.groupId
          ? { ...group, messages: [message], updatedAt: message.createdAt }
          : group
      )));
      setDraft('');
      setMediaFile(null);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="groups-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">FIND YOUR PEOPLE</p>
          <h1>Groups</h1>
        </div>
      </div>
      {error && <p className="error-message group-error" role="alert">{error}</p>}
      <div className="group-workspace">
        <aside className="group-sidebar">
          <form className="group-create-form card" onSubmit={createGroup}>
            <h2>Create a group chat</h2>
            <label htmlFor="group-name">Group name</label>
            <input
              id="group-name"
              maxLength="80"
              onChange={event => setGroupName(event.target.value)}
              placeholder="e.g. Weekend plans"
              required
              value={groupName}
            />
            <label htmlFor="group-members">Invite people</label>
            <select
              id="group-members"
              multiple
              onChange={event => setMemberIds(
                Array.from(event.target.selectedOptions, option => Number(option.value))
              )}
              value={memberIds.map(String)}
            >
              {users.map(person => <option key={person.id} value={person.id}>{person.username}</option>)}
            </select>
            <small className="form-hint">Choose at least one friend. You’ll be added automatically.</small>
            <button className="primary-button small-button" disabled={busy || memberIds.length === 0} type="submit">
              {busy ? 'Creating…' : 'Create group'}
            </button>
          </form>

          <div className="group-list">
            <h2>Your groups <span>{groups.length}</span></h2>
            {groups.length === 0 ? (
              <p className="muted group-list-empty">Your created or invited group chats will appear here.</p>
            ) : groups.map(group => {
              const lastMessage = group.messages?.[0];
              return (
                <button
                  className={`group-list-item${activeGroup?.id === group.id ? ' selected' : ''}`}
                  key={group.id}
                  onClick={() => setActiveGroup(group)}
                  type="button"
                >
                  <span className="group-avatar">✦</span>
                  <span className="group-list-copy">
                    <strong>{group.name}</strong>
                    <small>{lastMessage ? (lastMessage.content || (lastMessage.mediaType ? 'Attachment' : `${group.members?.length || 0} members`)) : `${group.members?.length || 0} members`}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="group-chat card">
          {activeGroup ? (
            <>
              <header className="group-chat-header">
                <div className="group-chat-title">
                  <span className="group-avatar">✦</span>
                  <div>
                    <h2>{activeGroup.name}</h2>
                    <p className="muted">{activeGroup.members?.map(member => member.username).join(', ')}</p>
                  </div>
                </div>
                {activeGroup.ownerId === user.id && !isRenaming && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setRenameName(activeGroup.name);
                      setIsRenaming(true);
                    }}
                    type="button"
                  >
                    Rename
                  </button>
                )}
              </header>

              {isRenaming && (
                <form className="rename-group-form" onSubmit={renameGroup}>
                  <input
                    aria-label="New group name"
                    maxLength="80"
                    onChange={event => setRenameName(event.target.value)}
                    required
                    value={renameName}
                  />
                  <button className="secondary-button" type="submit">Save name</button>
                  <button className="text-button" onClick={() => setIsRenaming(false)} type="button">Cancel</button>
                </form>
              )}

              <div aria-live="polite" className="group-messages">
                {messages.map(message => (
                  <div className={`group-message${message.userId === user.id ? ' own-message' : ''}`} key={message.id}>
                    {message.userId !== user.id && <strong>{message.author?.username}</strong>}
                    {message.content && <p>{message.content}</p>}
                    <MediaPreview mediaName={message.mediaName} mediaType={message.mediaType} mediaUrl={message.mediaUrl} />
                    <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                  </div>
                ))}
                {messages.length === 0 && <p className="muted group-chat-empty">Say hello to your group.</p>}
              </div>

              <MediaPicker file={mediaFile} onChange={setMediaFile} />
              <form className="message-form group-message-form" onSubmit={sendMessage}>
                <input
                  aria-label="Write a group message"
                  maxLength="4000"
                  onChange={event => setDraft(event.target.value)}
                  placeholder={`Message ${activeGroup.name}…`}
                  value={draft}
                />
                <button aria-label="Send group message" className="send-button" disabled={!draft.trim() && !mediaFile} type="submit">↑</button>
              </form>
            </>
          ) : (
            <div className="group-empty">
              <span className="group-avatar">✦</span>
              <h2>Your group chats live here</h2>
              <p className="muted">Create a group and invite people to start chatting.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(() => (
    window.localStorage.getItem('yourspace-theme') === 'light' ? 'light' : 'dark'
  ));
  const [activePage, setActivePage] = useState('posts');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('yourspace-theme', theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    request('/auth/me')
      .then(data => {
        if (active) setUser(data.user);
      })
      .catch(requestError => {
        if (active && requestError.status !== 401) setError(requestError.message);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    setError('');
    try {
      await request('/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (checkingSession) {
    return <main className="loading-screen"><div className="brand-mark">Y</div><p>Getting your space ready…</p></main>;
  }
  if (!user) {
    return (
      <>
        {error && <p className="connection-notice" role="alert">Could not reach the server: {error}</p>}
        <AuthScreen
          onAuthenticated={setUser}
          onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          theme={theme}
        />
      </>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#home"><span className="brand-mark">Y</span> YourSpace</a>
        <nav aria-label="Main navigation" className="main-nav">
          {[
            ['posts', 'Posts'],
            ['messages', 'Messages'],
            ['friends', 'Friends'],
            ['groups', 'Groups'],
          ].map(([page, label]) => (
            <button
              aria-current={activePage === page ? 'page' : undefined}
              className={`nav-link${activePage === page ? ' active' : ''}`}
              key={page}
              onClick={() => setActivePage(page)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <ThemeToggle onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} theme={theme} />
          <div className="topbar-user">
            <Avatar className="avatar-small" profilePictureUrl={user.profilePictureUrl} username={user.username} />
            <strong>{user.username}</strong>
            <button className="text-button" onClick={signOut} type="button">Sign out</button>
          </div>
        </div>
      </header>
      {error && <p className="connection-notice" role="alert">{error}</p>}
      <main className="main-layout" id="home">
        <aside className="profile-column">
          <section className="welcome-card card">
            <div className="welcome-art"><span>✳</span><i>✦</i></div>
            <Avatar className="welcome-avatar" profilePictureUrl={user.profilePictureUrl} username={user.username} />
            <p className="eyebrow">WELCOME TO YOUR SPACE</p>
            <h2>{user.username}</h2>
            <p className="muted">{user.email}</p>
            <ProfileSettings onDeleted={() => setUser(null)} onUpdated={setUser} user={user} />
          </section>
          <div className="tip-card">
            <span>✦</span>
            <p><strong>A little kindness goes a long way.</strong> Make this a place people love to visit.</p>
          </div>
        </aside>
        <section className="page-content">
          {activePage === 'posts' && <Feed user={user} />}
          {activePage === 'messages' && <Chat user={user} />}
          {activePage === 'friends' && <FriendsPage />}
          {activePage === 'groups' && <GroupsPage user={user} />}
        </section>
      </main>
    </div>
  );
}

export default App;
