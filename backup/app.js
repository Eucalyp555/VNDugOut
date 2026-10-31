let roster = [];

let db;

let currentAudio = null;

let editMode = true;

// =====================
// DATABASE
// =====================

const request =
    indexedDB.open(
        "VNDugOutDB",
        1
    );

request.onupgradeneeded = function(event){

    db = event.target.result;

    if(
        !db.objectStoreNames.contains(
            "songs"
        )
    ){

        db.createObjectStore(
            "songs"
        );
    }
};

request.onsuccess = function(event){

    db = event.target.result;

    renderRoster();
};

// =====================
// MODE SWITCH
// =====================

function toggleMode(){

    editMode = !editMode;

    const button =
        document.getElementById(
            "modeButton"
        );

    const controls =
        document.getElementById(
            "editControls"
        );

    if(editMode){

        button.innerText =
            "SWITCH TO GAME MODE";

        controls.classList.remove(
            "hidden"
        );
    }
    else{

        button.innerText =
            "SWITCH TO EDIT MODE";

        controls.classList.add(
            "hidden"
        );
    }

    renderRoster();
}

// =====================
// SONG STORAGE
// =====================

function saveSong(songId,file){

    return new Promise((resolve,reject)=>{

        const tx =
            db.transaction(
                ["songs"],
                "readwrite"
            );

        const store =
            tx.objectStore("songs");

        const req =
            store.put(
                file,
                songId
            );

        req.onsuccess =
            ()=>resolve();

        req.onerror =
            ()=>reject();
    });
}

function getSong(songId){

    return new Promise((resolve,reject)=>{

        const tx =
            db.transaction(
                ["songs"],
                "readonly"
            );

        const store =
            tx.objectStore(
                "songs"
            );

        const req =
            store.get(songId);

        req.onsuccess =
            ()=>resolve(req.result);

        req.onerror =
            ()=>reject();
    });
}

// =====================
// RENDER
// =====================

function renderRoster(){

    const container =
        document.getElementById(
            "players"
        );

    container.innerHTML = "";

    roster.forEach((player,index)=>{

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "player-card";

        if(editMode){

            card.innerHTML = `

                <input
                    class="player-name"
                    value="${player.name || ""}"
                    onchange="
                    roster[${index}].name=this.value">

                <br>

                <input
                    class="player-number"
                    type="number"
                    value="${player.number || 0}"
                    onchange="
                    roster[${index}].number=parseInt(this.value)">

                <div class="song-name">

                    🎵 ${player.songName || "No song selected"}

                </div>

                <button
                    class="play-button"
                    onclick="playSong(${index})">

                    PLAY WALKUP

                </button>

                <input
                    type="file"
                    accept=".mp3,audio/*"
                    onchange="setSong(event,${index})">

                <button
                    class="delete-button"
                    onclick="removePlayer(${index})">

                    DELETE PLAYER

                </button>
            `;
        }
        else{

            card.classList.add(
                "game-card"
            );

            card.innerHTML = `

                <div class="game-player-number">

                    #${player.number || 0}

                </div>

                <div class="game-player-name">

                    ${player.name || "Unnamed Player"}

                </div>

                <div class="song-name">

                    🎵 ${player.songName || "No walkup song"}

                </div>

                <button
                    class="play-button"
                    onclick="playSong(${index})">

                    PLAY WALKUP

                </button>
            `;
        }

        container.appendChild(
            card
        );
    });
}

// =====================
// PLAYBACK
// =====================

async function playSong(index){

    const player =
        roster[index];

    if(!player.songId){

        alert(
            "No song selected"
        );

        return;
    }

    const file =
        await getSong(
            player.songId
        );

    if(!file){

        alert(
            "Song not found"
        );

        return;
    }

    if(currentAudio){

        currentAudio.pause();
    }

    const url =
        URL.createObjectURL(
            file
        );

    currentAudio =
        new Audio(url);

    currentAudio.play();

    document
        .getElementById(
            "batterName"
        )
        .innerText =
            player.name;
}

function fadeOutMusic(){

    if(!currentAudio){

        return;
    }

    currentAudio.pause();

    currentAudio.currentTime = 0;

    document
        .getElementById(
            "batterName"
        )
        .innerText =
            "Nobody";
}

// =====================
// SONG PICKER
// =====================

async function setSong(event,index){

    const file =
        event.target.files[0];

    if(!file){

        return;
    }

    try{

        const songId =
            Date.now().toString();

        await saveSong(
            songId,
            file
        );

        roster[index].songId =
            songId;

        roster[index].songName =
            file.name;

        renderRoster();
    }
    catch(error){

        console.error(error);

        alert(
            "Error saving song"
        );
    }
}

// =====================
// PLAYERS
// =====================

function addPlayer(){

    roster.push({

        name:"New Player",

        number:0,

        songName:""
    });

    renderRoster();
}

function removePlayer(index){

    roster.splice(
        index,
        1
    );

    renderRoster();
}

// =====================
// SAVE / LOAD
// =====================

function saveRoster(){

    const json =
        JSON.stringify(
            roster,
            null,
            4
        );

    const blob =
        new Blob(
            [json],
            {
                type:
                "application/json"
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const a =
        document.createElement(
            "a"
        );

    a.href = url;

    a.download =
        "roster.json";

    a.click();

    URL.revokeObjectURL(
        url
    );
}

document
.getElementById(
    "loadFile"
)
.addEventListener(
    "change",
    loadRoster
);

function loadRoster(event){

    const file =
        event.target.files[0];

    if(!file){

        return;
    }

    const reader =
        new FileReader();

    reader.onload =
        function(e){

            roster =
                JSON.parse(
                    e.target.result
                );

            renderRoster();
        };

    reader.readAsText(file);
}