// 音乐播放器应用
document.addEventListener('DOMContentLoaded', function() {
    // 全局变量
    const audioPlayer = new Audio();
    let songs = [];
    let filteredSongs = [];
    let currentSongIndex = 0;
    let currentMode = 'order';
    let isPlaying = false;
    let scrollLyrics = [];
    let searchQuery = '';
    
    // 歌词滚动控制变量
    let userScrolledLyrics = false;
    let lyricsScrollTimer = null;
    const LYRIC_AUTO_SCROLL_DELAY = 5000; // 5秒后恢复自动滚动
    
    // DOM 元素引用
    let elements = {};
    
    // 初始化应用
    async function initApp() {
        try {
            // 初始化DOM元素引用
            initDOMElements();
            
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
                const loadingOverlay = document.getElementById('loading');
                if (loadingOverlay) {
                    loadingOverlay.style.display = 'none';
                }
            }, 500);
            
        } catch (error) {
            console.error('初始化应用时出错:', error);
            const loadingOverlay = document.getElementById('loading');
            if (loadingOverlay) {
                loadingOverlay.innerHTML = `
                    <div class="loading-spinner">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b; margin-bottom: 20px;"></i>
                        <p>加载失败: ${error.message}</p>
                        <p>请检查 songs-list.json 文件是否存在且格式正确</p>
                    </div>
                `;
            }
        }
    }
    
    // 初始化DOM元素引用
    function initDOMElements() {
        elements = {
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
            modeButtons: {
                order: document.getElementById('order-mode'),
                random: document.getElementById('random-mode'),
                single: document.getElementById('single-mode')
            },
            shufflePlaylistBtn: document.getElementById('shuffle-playlist'),
            searchInput: document.getElementById('search-input'),
            clearSearchBtn: document.getElementById('clear-search')
        };
        
        // 检查必要的元素是否存在
        const requiredElements = ['playlist', 'lyricsDisplay', 'songCount'];
        requiredElements.forEach(id => {
            if (!document.getElementById(id)) {
                console.warn(`元素 #${id} 未找到，请检查HTML结构`);
            }
        });
    }
    
    // 从 JSON 文件加载歌曲列表
    async function loadSongs() {
        try {
            const response = await fetch('songs-list.json');
            
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态码: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.songs || !Array.isArray(data.songs)) {
                throw new Error('歌曲列表格式错误，请确保 JSON 文件包含 "songs" 数组');
            }
            
            songs = data.songs.map((song, index) => ({
                ...song,
                index: index,
                duration: 0
            }));
            
            filteredSongs = [...songs];
            
            // 更新歌曲计数
            updateSongCount();
            
            // 渲染播放列表
            renderPlaylist();
            
            console.log(`成功加载 ${songs.length} 首歌曲`);
            
        } catch (error) {
            console.error('加载歌曲列表时出错:', error);
            throw error;
        }
    }
    
    // 更新歌曲计数
    function updateSongCount() {
        if (elements.songCount) {
            elements.songCount.textContent = `(${filteredSongs.length} 首)`;
        }
    }
    
    // 搜索歌曲
    function searchSongs(query) {
        searchQuery = query.toLowerCase().trim();
        
        if (searchQuery === '') {
            filteredSongs = [...songs];
        } else {
            filteredSongs = songs.filter(song => {
                const name = song.song_name ? song.song_name.toLowerCase() : '';
                const author = song.song_author ? song.song_author.toLowerCase() : '';
                return name.includes(searchQuery) || author.includes(searchQuery);
            });
        }
        
        updateSongCount();
        renderPlaylist();
    }
    
    // 渲染播放列表
    function renderPlaylist() {
        if (!elements.playlist) {
            console.error('播放列表容器未找到');
            return;
        }
        
        if (filteredSongs.length === 0) {
            elements.playlist.innerHTML = `
                <div class="playlist-empty">
                    <i class="fas fa-search"></i>
                    <p>${searchQuery ? '未找到匹配的歌曲' : '播放列表为空'}</p>
                    <p>${searchQuery ? '请尝试其他搜索词' : '请检查 songs-list.json 文件'}</p>
                </div>
            `;
            return;
        }
        
        let playlistHTML = '';
        
        filteredSongs.forEach((song, listIndex) => {
            const originalIndex = song.index;
            const isActive = originalIndex === currentSongIndex;
            
            const songName = song.song_name || '未知歌曲';
            const songAuthor = song.song_author || '未知歌手';
            const coverPath = song.cover_file ? 'covers/' + song.cover_file : 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/music.svg';
            
            playlistHTML += `
                <div class="playlist-item ${isActive ? 'active' : ''}" data-index="${originalIndex}" data-list-index="${listIndex}">
                    <div class="playlist-item-playing">
                        <i class="fas fa-play"></i>
                    </div>
                    <img src="${coverPath}" 
                         alt="${songName}" 
                         onerror="this.src='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/music.svg'">
                    <div class="playlist-item-info">
                        <div class="playlist-item-title">${highlightSearchTerm(songName)}</div>
                        <div class="playlist-item-artist">${highlightSearchTerm(songAuthor)}</div>
                    </div>
                    <div class="playlist-item-duration">${formatTime(song.duration)}</div>
                </div>
            `;
        });
        
        elements.playlist.innerHTML = playlistHTML;
        
        // 为每个播放列表项添加点击事件
        document.querySelectorAll('.playlist-item').forEach(item => {
            item.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                const listIndex = parseInt(this.getAttribute('data-list-index'));
                
                if (searchQuery) {
                    const song = filteredSongs[listIndex];
                    if (song) {
                        loadSong(song.index);
                        playSong();
                    }
                } else {
                    loadSong(index);
                    playSong();
                }
            });
        });
    }
    
    // 高亮搜索词
    function highlightSearchTerm(text) {
        if (!searchQuery || !text) return text;
        
        try {
            const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            return text.replace(regex, '<span class="highlight">$1</span>');
        } catch (e) {
            return text;
        }
    }
    
    // 初始化音频播放器
    function initAudioPlayer() {
        audioPlayer.volume = 0.7;
        updateVolumeUI();
        
        audioPlayer.addEventListener('loadedmetadata', function() {
            if (songs[currentSongIndex]) {
                songs[currentSongIndex].duration = audioPlayer.duration;
                if (elements.duration) {
                    elements.duration.textContent = formatTime(audioPlayer.duration);
                }
                updatePlaylistDuration(currentSongIndex, audioPlayer.duration);
                parseLyrics();
            }
        });
        
        audioPlayer.addEventListener('timeupdate', function() {
            if (elements.currentTime) {
                elements.currentTime.textContent = formatTime(audioPlayer.currentTime);
            }
            
            const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100 || 0;
            if (elements.songProgress) {
                elements.songProgress.style.width = `${progress}%`;
            }
            if (elements.progressThumb) {
                elements.progressThumb.style.left = `${progress}%`;
            }
            
            updateLyricsHighlight();
        });
        
        audioPlayer.addEventListener('ended', function() {
            if (currentMode === 'single') {
                audioPlayer.currentTime = 0;
                playSong();
            } else {
                playNextSong();
            }
        });
        
        audioPlayer.addEventListener('error', function() {
            console.error('音频加载错误:', audioPlayer.error);
            if (songs[currentSongIndex]) {
                // 尝试小写扩展名
                const songFile = songs[currentSongIndex].song_file;
                if (songFile) {
                    const lowerCaseFile = songFile.replace(/\.MP3$/i, '.mp3').replace(/\.WAV$/i, '.wav');
                    if (lowerCaseFile !== songFile) {
                        console.log('尝试使用小写扩展名:', lowerCaseFile);
                        audioPlayer.src = 'songs/' + lowerCaseFile;
                        return;
                    }
                }
                alert(`无法播放 "${songs[currentSongIndex].song_name}"，请检查音频文件是否存在或格式是否正确。`);
            }
        });
    }
    
    // 设置事件监听器
    function setupEventListeners() {
        // 播放控制
        if (elements.playBtn) elements.playBtn.addEventListener('click', togglePlay);
        if (elements.prevBtn) elements.prevBtn.addEventListener('click', playPrevSong);
        if (elements.nextBtn) elements.nextBtn.addEventListener('click', playNextSong);
        
        // 进度条
        if (elements.progressBar) {
            elements.progressBar.addEventListener('click', function(e) {
                const rect = this.getBoundingClientRect();
                const percentage = (e.clientX - rect.left) / rect.width;
                const newTime = percentage * audioPlayer.duration;
                
                if (!isNaN(newTime)) {
                    audioPlayer.currentTime = newTime;
                }
            });
        }
        
        // 音量控制
        if (elements.volumeSlider) {
            elements.volumeSlider.addEventListener('click', function(e) {
                const rect = this.getBoundingClientRect();
                const percentage = 1 - ((e.clientY - rect.top) / rect.height);
                const newVolume = Math.max(0, Math.min(1, percentage));
                
                audioPlayer.volume = newVolume;
                updateVolumeUI();
            });
        }
        
        // 播放模式
        if (elements.modeButtons.order) {
            elements.modeButtons.order.addEventListener('click', () => setPlayMode('order'));
        }
        if (elements.modeButtons.random) {
            elements.modeButtons.random.addEventListener('click', () => setPlayMode('random'));
        }
        if (elements.modeButtons.single) {
            elements.modeButtons.single.addEventListener('click', () => setPlayMode('single'));
        }
        
        // 播放列表控制
        if (elements.shufflePlaylistBtn) {
            elements.shufflePlaylistBtn.addEventListener('click', shufflePlaylist);
        }
        
        // 搜索功能
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', function() {
                searchSongs(this.value);
            });
            
            elements.searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && filteredSongs.length > 0) {
                    const firstSong = filteredSongs[0];
                    loadSong(firstSong.index);
                    playSong();
                }
            });
        }
        
        if (elements.clearSearchBtn) {
            elements.clearSearchBtn.addEventListener('click', function() {
                if (elements.searchInput) {
                    elements.searchInput.value = '';
                    searchSongs('');
                }
            });
        }
        
        // 歌词容器滚动监听
        if (elements.lyricsDisplay) {
            elements.lyricsDisplay.addEventListener('wheel', handleLyricsUserScroll);
            elements.lyricsDisplay.addEventListener('touchmove', handleLyricsUserScroll);
            elements.lyricsDisplay.addEventListener('scroll', handleLyricsUserScroll);
        }
    }
    
    // 处理用户滚动歌词
    function handleLyricsUserScroll() {
        // 标记用户正在手动滚动
        userScrolledLyrics = true;
        
        // 清除之前的定时器
        if (lyricsScrollTimer) {
            clearTimeout(lyricsScrollTimer);
        }
        
        // 设置5秒后恢复自动滚动
        lyricsScrollTimer = setTimeout(() => {
            userScrolledLyrics = false;
            // 恢复自动滚动到当前歌词
            const currentTime = audioPlayer.currentTime;
            const lyricLines = document.querySelectorAll('.lyric-line');
            const song = songs[currentSongIndex];
            
            if (song && song.has_scroll_lyric && scrollLyrics.length > 0) {
                let activeIndex = -1;
                for (let i = scrollLyrics.length - 1; i >= 0; i--) {
                    if (currentTime >= scrollLyrics[i].time) {
                        activeIndex = i;
                        break;
                    }
                }
                
                if (activeIndex >= 0 && activeIndex < lyricLines.length) {
                    scrollToLyricLine(lyricLines[activeIndex]);
                }
            }
        }, LYRIC_AUTO_SCROLL_DELAY);
    }
    
    // 滚动到指定歌词行（使其位于歌词框中央）
    function scrollToLyricLine(lineElement) {
        if (!lineElement || !elements.lyricsDisplay) return;
        
        const container = elements.lyricsDisplay;
        const lineTop = lineElement.offsetTop;
        const lineHeight = lineElement.offsetHeight;
        const containerHeight = container.clientHeight;
        
        // 计算目标滚动位置，使歌词行位于容器中央
        const targetScrollTop = lineTop - (containerHeight / 2) + (lineHeight / 2);
        
        // 限制滚动范围（避免滚动过头）
        const maxScrollTop = container.scrollHeight - containerHeight;
        const safeScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
        
        // 平滑滚动到目标位置
        container.scrollTo({
            top: safeScrollTop,
            behavior: 'smooth'
        });
    }
    
    // 加载指定索引的歌曲
    function loadSong(index) {
        if (index < 0 || index >= songs.length || !songs[index]) return;
        
        const song = songs[index];
        currentSongIndex = index;
        
        // 重置歌词滚动状态
        userScrolledLyrics = false;
        if (lyricsScrollTimer) {
            clearTimeout(lyricsScrollTimer);
            lyricsScrollTimer = null;
        }
        
        // 更新UI
        if (elements.songTitle) elements.songTitle.textContent = song.song_name;
        if (elements.songArtist) elements.songArtist.textContent = song.song_author;
        
        // 设置专辑封面
        const coverPath = song.cover_file ? 'covers/' + song.cover_file : '';
        if (elements.coverImage) {
            elements.coverImage.src = coverPath;
            elements.coverImage.onerror = function() {
                this.src = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/compact-disc.svg';
            };
        }
        
        // 设置音频源（支持大小写扩展名）
        const songFile = song.song_file;
        const basePath = 'songs/';
        
        // 先尝试原始文件名
        audioPlayer.src = basePath + songFile;
        
        // 重置时间和进度条
        if (elements.currentTime) elements.currentTime.textContent = '0:00';
        if (elements.songProgress) elements.songProgress.style.width = '0%';
        if (elements.progressThumb) elements.progressThumb.style.left = '0%';
        
        // 更新播放列表高亮
        updatePlaylistHighlight();
        
        // 解析歌词
        parseLyrics();
        
        // 如果之前正在播放，继续播放
        if (isPlaying) {
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
                if (elements.playBtn) {
                    elements.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                    elements.playBtn.title = '暂停';
                }
                
                const coverWrapper = document.querySelector('.cover-wrapper');
                if (coverWrapper) coverWrapper.classList.add('playing');
                
                updatePlaylistHighlight();
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
        if (elements.playBtn) {
            elements.playBtn.innerHTML = '<i class="fas fa-play"></i>';
            elements.playBtn.title = '播放';
        }
        
        const coverWrapper = document.querySelector('.cover-wrapper');
        if (coverWrapper) coverWrapper.classList.remove('playing');
    }
    
    // 播放下一首歌曲
    function playNextSong() {
        let nextIndex;
        
        switch (currentMode) {
            case 'random':
                nextIndex = getRandomSongIndex();
                break;
            case 'single':
                nextIndex = currentSongIndex;
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
                prevIndex = currentSongIndex;
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
    
    // 获取随机歌曲索引
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
            const button = elements.modeButtons[key];
            if (button) {
                if (key === mode) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            }
        });
        
        // 更新模式显示文本
        const modeTexts = {
            order: '顺序播放',
            random: '随机播放',
            single: '单曲循环'
        };
        if (elements.currentMode) {
            elements.currentMode.textContent = modeTexts[mode];
        }
    }
    
    // 随机播放列表
    function shufflePlaylist() {
        // Fisher-Yates 洗牌算法
        for (let i = songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [songs[i], songs[j]] = [songs[j], songs[i]];
        }
        
        songs.forEach((song, index) => {
            song.index = index;
        });
        
        searchSongs(searchQuery);
        
        const currentSongId = songs.find(song => song.index === currentSongIndex)?.id;
        if (currentSongId) {
            const newIndex = songs.findIndex(song => song.id === currentSongId);
            if (newIndex !== -1) {
                currentSongIndex = newIndex;
                updatePlaylistHighlight();
            }
        }
        
        showNotification('播放列表已随机排序');
    }
    
    // 解析歌词
    function parseLyrics() {
        if (!elements.lyricsDisplay) return;
        
        const song = songs[currentSongIndex];
        if (!song) return;
        
        elements.lyricsDisplay.innerHTML = '';
        scrollLyrics = [];
        
        if (!song.song_lyric || song.song_lyric.trim() === '') {
            elements.lyricsDisplay.innerHTML = '<div class="no-lyrics">该歌曲暂无歌词</div>';
            return;
        }
        
        const lyrics = song.song_lyric;
        let lyricsHTML = '';
        
        // 添加顶部占位行（用于确保第一行歌词可以滚动到中央）
        lyricsHTML += '<div class="lyric-spacer large-spacer"></div>';
        
        if (song.has_scroll_lyric) {
            const lines = lyrics.split('\n');
            let lastTime = 0;
            
            lines.forEach(line => {
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
                        
                        // 计算与前一句的时间间隔
                        const timeGap = timeInSeconds - lastTime;
                        lastTime = timeInSeconds;
                        
                        // 如果时间间隔较大，添加额外的间距
                        const extraClass = timeGap > 10 ? 'large-gap' : '';
                        
                        lyricsHTML += `
                            <div class="lyric-line ${extraClass}" data-time="${timeInSeconds}">
                                ${text}
                            </div>
                        `;
                    }
                } else if (line.trim()) {
                    lyricsHTML += `
                        <div class="lyric-line">
                            ${line}
                        </div>
                    `;
                }
            });
        } else {
            const lines = lyrics.split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    lyricsHTML += `
                        <div class="lyric-line">
                            ${line}
                        </div>
                    `;
                }
            });
        }
        
        // 添加底部占位行（用于确保最后一行歌词可以滚动到中央）
        lyricsHTML += '<div class="lyric-spacer large-spacer"></div>';
        
        elements.lyricsDisplay.innerHTML = lyricsHTML;
        
        // 初始化滚动到顶部
        elements.lyricsDisplay.scrollTop = 0;
    }
    
    // 更新歌词高亮
    function updateLyricsHighlight() {
        const currentTime = audioPlayer.currentTime;
        const lyricLines = document.querySelectorAll('.lyric-line');
        
        // 如果没有歌词，直接返回
        if (lyricLines.length === 0) return;
        
        // 移除所有高亮
        lyricLines.forEach(line => line.classList.remove('active'));
        
        const song = songs[currentSongIndex];
        if (!song || !song.has_scroll_lyric || scrollLyrics.length === 0) {
            return;
        }
        
        // 找到当前时间对应的歌词索引
        let activeIndex = -1;
        for (let i = scrollLyrics.length - 1; i >= 0; i--) {
            if (currentTime >= scrollLyrics[i].time) {
                activeIndex = i;
                break;
            }
        }
        
        // 如果没有找到合适的歌词行，返回
        if (activeIndex < 0) {
            // 可能歌词还没开始，高亮第一行
            const firstLine = lyricLines[0];
            if (firstLine && currentTime < 1) {
                firstLine.classList.add('active');
            }
            return;
        }
        
        // 高亮当前歌词行
        const activeLine = lyricLines[activeIndex];
        if (!activeLine) return;
        
        activeLine.classList.add('active');
        
        // 如果用户没有手动滚动，则自动滚动到当前歌词行
        if (!userScrolledLyrics) {
            scrollToLyricLine(activeLine);
        }
    }
    
    // 更新音量UI
    function updateVolumeUI() {
        const volume = audioPlayer.volume;
        if (elements.volumeLevel) {
            elements.volumeLevel.style.height = `${volume * 100}%`;
        }
        if (elements.volumeThumb) {
            elements.volumeThumb.style.bottom = `${volume * 100}%`;
        }
        
        const volumeIcon = elements.volumeBtn?.querySelector('i');
        if (volumeIcon) {
            if (volume === 0) {
                volumeIcon.className = 'fas fa-volume-mute';
            } else if (volume < 0.5) {
                volumeIcon.className = 'fas fa-volume-down';
            } else {
                volumeIcon.className = 'fas fa-volume-up';
            }
        }
    }
    
    // 更新播放列表高亮
    function updatePlaylistHighlight() {
        document.querySelectorAll('.playlist-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const listItem = Array.from(document.querySelectorAll('.playlist-item')).find(item => {
            return parseInt(item.getAttribute('data-index')) === currentSongIndex;
        });
        
        if (listItem) {
            listItem.classList.add('active');
            
            const container = elements.playlist;
            if (container) {
                const itemTop = listItem.offsetTop;
                const containerHeight = container.clientHeight;
                
                container.scrollTo({
                    top: itemTop - containerHeight / 3,
                    behavior: 'smooth'
                });
            }
        }
    }
    
    // 更新播放列表中的歌曲时长
    function updatePlaylistDuration(index, duration) {
        if (songs[index]) {
            songs[index].duration = duration;
        }
        
        document.querySelectorAll('.playlist-item').forEach(item => {
            if (parseInt(item.getAttribute('data-index')) === index) {
                const durationElement = item.querySelector('.playlist-item-duration');
                if (durationElement) {
                    durationElement.textContent = formatTime(duration);
                }
            }
        });
    }
    
    // 格式化时间
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    // 显示通知
    function showNotification(message) {
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
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
            if (styleSheet.parentNode) {
                styleSheet.remove();
            }
        }, 2500);
    }
    
    // 初始化应用
    initApp();
});
