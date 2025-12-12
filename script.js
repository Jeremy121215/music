// 音乐播放器应用
document.addEventListener('DOMContentLoaded', function() {
    // 全局变量
    const audioPlayer = new Audio();
    let songs = [];
    let currentSongIndex = 0;
    let currentMode = 'order'; // 播放模式: order, random, single
    let isPlaying = false;
    let scrollLyrics = [];
    
    // DOM 元素
    const elements = {
        songTitle: document.getElementById('song-title'),
        songArtist: document.getElementById('song-artist'),
        coverImage: document.getElementById('cover-image'),
        playBtn: document.getElementById('play-btn'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        currentTime: document.getElementById('current-time'),
        duration: document.getElementById('duration'),
        songProgress: document.getElementById('song-progress'),
        progressBar: document.querySelector('.progress-bar'),
        progressThumb: document.getElementById('progress-thumb'),
        volumeBtn: document.getElementById('volume-btn'),
        volumeLevel: document.getElementById('volume-level'),
        volumeSlider: document.querySelector('.volume-slider'),
        volumeThumb: document.getElementById('volume-thumb'),
        lyricsDisplay: document.getElementById('lyrics-display'),
        playlist: document.getElementById('playlist'),
        songCount: document.getElementById('song-count'),
        currentMode: document.getElementById('current-mode'),
        loadingOverlay: document.getElementById('loading'),
        modeButtons: {
            order: document.getElementById('order-mode'),
            random: document.getElementById('random-mode'),
            single: document.getElementById('single-mode')
        },
        shufflePlaylistBtn: document.getElementById('shuffle-playlist')
    };
    
    // 初始化应用
    async function initApp() {
        try {
            // 加载歌曲列表
            await loadSongs();
            
            // 设置事件监听器
            setupEventListeners();
            
            // 初始化音频播放器
            initAudioPlayer();
            
            // 加载第一首歌
            if (songs.length > 0) {
                loadSong(currentSongIndex);
            }
            
            // 隐藏加载动画
            setTimeout(() => {
                elements.loadingOverlay.style.display = 'none';
            }, 500);
            
        } catch (error) {
            console.error('初始化应用时出错:', error);
            elements.loadingOverlay.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b; margin-bottom: 20px;"></i>
                    <p>加载失败: ${error.message}</p>
                    <p>请检查 songs-list.json 文件是否存在且格式正确</p>
                </div>
            `;
        }
    }
    
    // 从 JSON 文件加载歌曲列表
    async function loadSongs() {
        try {
            const response = await fetch('songs-list.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.songs || !Array.isArray(data.songs)) {
                throw new Error('歌曲列表格式错误，请确保 JSON 文件包含 "songs" 数组');
            }
            
            songs = data.songs.map((song, index) => ({
                ...song,
                index: index,
                duration: 0 // 将在加载音频后设置
            }));
            
            // 更新歌曲计数
            elements.songCount.textContent = `(${songs.length} 首)`;
            
            // 渲染播放列表
            renderPlaylist();
            
        } catch (error) {
            console.error('加载歌曲列表时出错:', error);
            throw error;
        }
    }
    
    // 渲染播放列表
    function renderPlaylist() {
        if (songs.length === 0) {
            elements.playlist.innerHTML = `
                <div class="playlist-empty">
                    <i class="fas fa-music"></i>
                    <p>播放列表为空</p>
                    <p>请检查 songs-list.json 文件</p>
                </div>
            `;
            return;
        }
        
        let playlistHTML = '';
        
        songs.forEach((song, index) => {
            // 获取歌曲文件扩展名
            const fileExt = song.song_file.split('.').pop().toLowerCase();
            const isAudioFile = ['mp3', 'wav', 'ogg', 'm4a'].includes(fileExt);
            
            playlistHTML += `
                <div class="playlist-item ${index === currentSongIndex ? 'active' : ''}" data-index="${index}">
                    <img src="${song.cover_file ? 'covers/' + song.cover_file : 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/music.svg'}" 
                         alt="${song.song_name}" 
                         onerror="this.src='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/music.svg'">
                    <div class="playlist-item-info">
                        <div class="playlist-item-title">${song.song_name || '未知歌曲'}</div>
                        <div class="playlist-item-artist">${song.song_author || '未知歌手'}</div>
                    </div>
                    <div class="playlist-item-duration">${formatTime(song.duration)}</div>
                    ${!isAudioFile ? '<span style="color:#ff6b6b; font-size:0.8rem; margin-left:10px;">格式不支持</span>' : ''}
                </div>
            `;
        });
        
        elements.playlist.innerHTML = playlistHTML;
        
        // 为每个播放列表项添加点击事件
        document.querySelectorAll('.playlist-item').forEach(item => {
            item.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                loadSong(index);
                playSong();
            });
        });
    }
    
    // 初始化音频播放器
    function initAudioPlayer() {
        // 设置初始音量
        audioPlayer.volume = 0.7;
        updateVolumeUI();
        
        // 音频加载完成事件
        audioPlayer.addEventListener('loadedmetadata', function() {
            // 更新歌曲时长
            songs[currentSongIndex].duration = audioPlayer.duration;
            elements.duration.textContent = formatTime(audioPlayer.duration);
            
            // 更新播放列表中的时长
            updatePlaylistDuration(currentSongIndex, audioPlayer.duration);
            
            // 解析歌词
            parseLyrics();
        });
        
        // 音频时间更新事件
        audioPlayer.addEventListener('timeupdate', function() {
            // 更新当前时间
            elements.currentTime.textContent = formatTime(audioPlayer.currentTime);
            
            // 更新进度条
            const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100 || 0;
            elements.songProgress.style.width = `${progress}%`;
            elements.progressThumb.style.left = `${progress}%`;
            
            // 更新歌词高亮
            updateLyricsHighlight();
        });
        
        // 音频播放结束事件
        audioPlayer.addEventListener('ended', function() {
            if (currentMode === 'single') {
                // 单曲循环：重新播放当前歌曲
                audioPlayer.currentTime = 0;
                playSong();
            } else {
                // 顺序或随机：播放下一首
                playNextSong();
            }
        });
        
        // 音频错误处理
        audioPlayer.addEventListener('error', function() {
            console.error('音频加载错误:', audioPlayer.error);
            alert(`无法播放 "${songs[currentSongIndex].song_name}"，请检查音频文件是否存在或格式是否正确。`);
        });
    }
    
    // 设置事件监听器
    function setupEventListeners() {
        // 播放/暂停按钮
        elements.playBtn.addEventListener('click', togglePlay);
        
        // 上一首/下一首按钮
        elements.prevBtn.addEventListener('click', playPrevSong);
        elements.nextBtn.addEventListener('click', playNextSong);
        
        // 进度条点击事件
        elements.progressBar.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const percentage = (e.clientX - rect.left) / rect.width;
            const newTime = percentage * audioPlayer.duration;
            
            if (!isNaN(newTime)) {
                audioPlayer.currentTime = newTime;
            }
        });
        
        // 音量控制
        elements.volumeSlider.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const percentage = 1 - ((e.clientY - rect.top) / rect.height);
            const newVolume = Math.max(0, Math.min(1, percentage));
            
            audioPlayer.volume = newVolume;
            updateVolumeUI();
        });
        
        // 播放模式按钮
        elements.modeButtons.order.addEventListener('click', function() {
            setPlayMode('order');
        });
        
        elements.modeButtons.random.addEventListener('click', function() {
            setPlayMode('random');
        });
        
        elements.modeButtons.single.addEventListener('click', function() {
            setPlayMode('single');
        });
        
        // 随机播放列表按钮
        elements.shufflePlaylistBtn.addEventListener('click', shufflePlaylist);
        
        // 窗口大小变化时调整UI
        window.addEventListener('resize', adjustUIForScreenSize);
    }
    
    // 加载指定索引的歌曲
    function loadSong(index) {
        if (index < 0 || index >= songs.length) return;
        
        const song = songs[index];
        currentSongIndex = index;
        
        // 更新UI
        elements.songTitle.textContent = song.song_name;
        elements.songArtist.textContent = song.song_author;
        
        // 设置专辑封面（确保1:1比例）
        const coverPath = song.cover_file ? 'covers/' + song.cover_file : '';
        elements.coverImage.src = coverPath;
        elements.coverImage.onerror = function() {
            this.src = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/compact-disc.svg';
        };
        
        // 设置音频源
        audioPlayer.src = 'songs/' + song.song_file;
        
        // 重置时间和进度条
        elements.currentTime.textContent = '0:00';
        elements.songProgress.style.width = '0%';
        elements.progressThumb.style.left = '0%';
        
        // 更新播放列表高亮
        updatePlaylistHighlight();
        
        // 解析歌词
        parseLyrics();
        
        // 如果之前正在播放，继续播放
        if (isPlaying) {
            // 先暂停，然后重新播放以确保加载新源
            audioPlayer.pause();
            setTimeout(() => {
                playSong();
            }, 100);
        }
    }
    
    // 播放/暂停切换
    function togglePlay() {
        if (audioPlayer.src) {
            if (isPlaying) {
                pauseSong();
            } else {
                playSong();
            }
        } else if (songs.length > 0) {
            // 如果没有加载歌曲但列表中有歌曲，加载并播放第一首
            loadSong(0);
            playSong();
        }
    }
    
    // 播放歌曲
    function playSong() {
        const playPromise = audioPlayer.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isPlaying = true;
                elements.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                elements.playBtn.title = '暂停';
                
                // 添加播放动画
                document.querySelector('.cover-wrapper').classList.add('playing');
            }).catch(error => {
                console.error('播放失败:', error);
                alert('播放失败，请检查音频文件格式或浏览器自动播放策略。');
            });
        }
    }
    
    // 暂停歌曲
    function pauseSong() {
        audioPlayer.pause();
        isPlaying = false;
        elements.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        elements.playBtn.title = '播放';
        
        // 移除播放动画
        document.querySelector('.cover-wrapper').classList.remove('playing');
    }
    
    // 播放下一首歌曲
    function playNextSong() {
        let nextIndex;
        
        switch (currentMode) {
            case 'random':
                nextIndex = getRandomSongIndex();
                break;
            case 'single':
                nextIndex = currentSongIndex; // 单曲循环时播放同一首
                break;
            case 'order':
            default:
                nextIndex = (currentSongIndex + 1) % songs.length;
                break;
        }
        
        loadSong(nextIndex);
        playSong();
    }
    
    // 播放上一首歌曲
    function playPrevSong() {
        let prevIndex;
        
        switch (currentMode) {
            case 'random':
                prevIndex = getRandomSongIndex();
                break;
            case 'single':
                prevIndex = currentSongIndex; // 单曲循环时播放同一首
                break;
            case 'order':
            default:
                prevIndex = currentSongIndex - 1;
                if (prevIndex < 0) prevIndex = songs.length - 1;
                break;
        }
        
        loadSong(prevIndex);
        playSong();
    }
    
    // 获取随机歌曲索引（排除当前歌曲）
    function getRandomSongIndex() {
        if (songs.length <= 1) return 0;
        
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * songs.length);
        } while (randomIndex === currentSongIndex && songs.length > 1);
        
        return randomIndex;
    }
    
    // 设置播放模式
    function setPlayMode(mode) {
        currentMode = mode;
        
        // 更新按钮状态
        Object.keys(elements.modeButtons).forEach(key => {
            if (key === mode) {
                elements.modeButtons[key].classList.add('active');
            } else {
                elements.modeButtons[key].classList.remove('active');
            }
        });
        
        // 更新模式显示文本
        const modeTexts = {
            order: '顺序播放',
            random: '随机播放',
            single: '单曲循环'
        };
        elements.currentMode.textContent = modeTexts[mode];
    }
    
    // 随机播放列表
    function shufflePlaylist() {
        // Fisher-Yates 洗牌算法
        for (let i = songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [songs[i], songs[j]] = [songs[j], songs[i]];
        }
        
        // 更新索引
        songs.forEach((song, index) => {
            song.index = index;
        });
        
        // 重新渲染播放列表
        renderPlaylist();
        
        // 如果当前播放的歌曲在列表中，找到它的新位置
        const currentSongId = songs.find(song => song.index === currentSongIndex)?.id;
        if (currentSongId) {
            const newIndex = songs.findIndex(song => song.id === currentSongId);
            if (newIndex !== -1) {
                currentSongIndex = newIndex;
                updatePlaylistHighlight();
            }
        }
        
        // 短暂提示
        showNotification('播放列表已随机排序');
    }
    
    // 解析歌词
    function parseLyrics() {
        const song = songs[currentSongIndex];
        elements.lyricsDisplay.innerHTML = '';
        scrollLyrics = [];
        
        if (!song.song_lyric || song.song_lyric.trim() === '') {
            elements.lyricsDisplay.innerHTML = '<div class="no-lyrics">该歌曲暂无歌词</div>';
            return;
        }
        
        const lyrics = song.song_lyric;
        
        if (song.has_scroll_lyric) {
            // 解析滚动歌词（带时间戳）
            const lines = lyrics.split('\n');
            let lyricsHTML = '';
            
            lines.forEach(line => {
                // 匹配时间戳和歌词内容
                const match = line.match(/\[(\d+):(\d+)(?:\.(\d+))?\](.*)/);
                
                if (match) {
                    const minutes = parseInt(match[1]);
                    const seconds = parseInt(match[2]);
                    const milliseconds = match[3] ? parseInt(match[3]) : 0;
                    const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
                    const text = match[4].trim();
                    
                    if (text) {
                        scrollLyrics.push({
                            time: timeInSeconds,
                            text: text
                        });
                        
                        lyricsHTML += `
                            <div class="lyric-line" data-time="${timeInSeconds}">
                                <span class="lyric-time">${formatTime(timeInSeconds)}</span>
                                ${text}
                            </div>
                        `;
                    }
                } else if (line.trim()) {
                    // 没有时间戳的歌词行
                    lyricsHTML += `
                        <div class="lyric-line">
                            ${line}
                        </div>
                    `;
                }
            });
            
            elements.lyricsDisplay.innerHTML = lyricsHTML;
        } else {
            // 普通歌词（无时间戳）
            const lines = lyrics.split('\n');
            let lyricsHTML = '';
            
            lines.forEach(line => {
                if (line.trim()) {
                    lyricsHTML += `
                        <div class="lyric-line">
                            ${line}
                        </div>
                    `;
                }
            });
            
            elements.lyricsDisplay.innerHTML = lyricsHTML;
        }
    }
    
    // 更新歌词高亮
    function updateLyricsHighlight() {
        const currentTime = audioPlayer.currentTime;
        const lyricLines = document.querySelectorAll('.lyric-line');
        
        // 移除所有高亮
        lyricLines.forEach(line => line.classList.remove('active'));
        
        if (songs[currentSongIndex].has_scroll_lyric && scrollLyrics.length > 0) {
            // 滚动歌词：找到当前时间对应的歌词
            let activeIndex = -1;
            
            for (let i = scrollLyrics.length - 1; i >= 0; i--) {
                if (currentTime >= scrollLyrics[i].time) {
                    activeIndex = i;
                    break;
                }
            }
            
            if (activeIndex >= 0) {
                const activeLine = lyricLines[activeIndex];
                if (activeLine) {
                    activeLine.classList.add('active');
                    
                    // 滚动到当前歌词位置
                    const container = elements.lyricsDisplay;
                    const lineTop = activeLine.offsetTop;
                    const containerHeight = container.clientHeight;
                    
                    container.scrollTo({
                        top: lineTop - containerHeight / 2,
                        behavior: 'smooth'
                    });
                }
            }
        }
    }
    
    // 更新音量UI
    function updateVolumeUI() {
        const volume = audioPlayer.volume;
        elements.volumeLevel.style.height = `${volume * 100}%`;
        elements.volumeThumb.style.bottom = `${volume * 100}%`;
        
        // 更新音量图标
        const volumeIcon = elements.volumeBtn.querySelector('i');
        if (volume === 0) {
            volumeIcon.className = 'fas fa-volume-mute';
        } else if (volume < 0.5) {
            volumeIcon.className = 'fas fa-volume-down';
        } else {
            volumeIcon.className = 'fas fa-volume-up';
        }
    }
    
    // 更新播放列表高亮
    function updatePlaylistHighlight() {
        document.querySelectorAll('.playlist-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const currentItem = document.querySelector(`.playlist-item[data-index="${currentSongIndex}"]`);
        if (currentItem) {
            currentItem.classList.add('active');
            
            // 滚动到当前歌曲位置
            const container = elements.playlist;
            const itemTop = currentItem.offsetTop;
            const containerHeight = container.clientHeight;
            
            container.scrollTo({
                top: itemTop - containerHeight / 3,
                behavior: 'smooth'
            });
        }
    }
    
    // 更新播放列表中的歌曲时长
    function updatePlaylistDuration(index, duration) {
        const playlistItem = document.querySelector(`.playlist-item[data-index="${index}"]`);
        if (playlistItem) {
            const durationElement = playlistItem.querySelector('.playlist-item-duration');
            if (durationElement) {
                durationElement.textContent = formatTime(duration);
            }
        }
    }
    
    // 格式化时间（秒 -> MM:SS）
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    // 显示通知
    function showNotification(message) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(90deg, #6a11cb 0%, #2575fc 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 1000;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2s forwards;
        `;
        
        // 添加动画关键帧
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(styleSheet);
        
        document.body.appendChild(notification);
        
        // 3秒后移除通知
        setTimeout(() => {
            notification.remove();
            styleSheet.remove();
        }, 2500);
    }
    
    // 根据屏幕大小调整UI
    function adjustUIForScreenSize() {
        // 这里可以添加响应式调整逻辑
        // 例如在小屏幕上隐藏某些元素或调整布局
    }
    
    // 错误处理：图片加载失败
    function handleImageError(img) {
        img.src = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/music.svg';
        img.alt = '默认专辑封面';
    }
    
    // 全局错误处理
    window.addEventListener('error', function(event) {
        console.error('全局错误:', event.error);
    });
    
    // 初始化应用
    initApp();
});
