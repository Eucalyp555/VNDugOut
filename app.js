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
            tx.objectStore(
                "songs"
            );

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
            ()=>resolve(
                req.result
            );

        req.onerror =
            ()=>reject();
    });
}



// =====================
// UTILITIES
// =====================

function fileToBase64(file){

    return new Promise((resolve)=>{

        const reader =
            new FileReader();

        reader.onload =
            ()=>resolve(
                reader.result
            );

        reader.readAsDataURL(
            file
        );
    });
}

function base64ToFile(
    base64,
    filename
){

    const arr =
        base64.split(",");

    const mime =
        arr[0].match(
            /:(.*?);/
        )[1];

    const bstr =
        atob(arr[1]);

    let n =
        bstr.length;

    const u8arr =
        new Uint8Array(n);

    while(n--){

        u8arr[n] =
            bstr.charCodeAt(n);
    }

    return new File(

        [u8arr],

        filename,

        {
            type:mime
        }
    );
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
                    onchange="roster[${index}].name=this.value">

                <br>

                <input
                    class="player-number"
                    type="number"
                    value="${player.number || 0}"
                    onchange="roster[${index}].number=parseInt(this.value)">

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

    currentAudio.currentTime =
        0;

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
// EXPORT TEAM
// =====================

async function exportTeamPackage(){

    const songs = {};

    for(const player of roster){

        if(player.songId){

            const song =
                await getSong(
                    player.songId
                );

            if(song){

                songs[player.songId] = {

                    name:
                        player.songName,

                    data:
                        await fileToBase64(
                            song
                        )
                };
            }
        }
    }

    const packageData = {

        roster:
            roster,

        songs:
            songs
    };

    const json =
        JSON.stringify(
            packageData,
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

    a.href =
        url;

    a.download =
        "VNDugOut_Team.json";

    a.click();

    URL.revokeObjectURL(
        url
    );
}



// =====================
// IMPORT TEAM
// =====================

document
.getElementById(
    "importTeamFile"
)
.addEventListener(
    "change",
    importTeamPackage
);

async function importTeamPackage(event){

    const file =
        event.target.files[0];

    if(!file){

        return;
    }

    const reader =
        new FileReader();

    reader.onload =
        async function(e){

            try{

                const packageData =
                    JSON.parse(
                        e.target.result
                    );

                roster =
                    packageData.roster || [];

                if(packageData.songs){

                    for(
                        const songId
                        in
                        packageData.songs
                    ){

                        const song =
                            packageData.songs[
                                songId
                            ];

                        const fileObj =
                            base64ToFile(
                                song.data,
                                song.name
                            );

                        await saveSong(
                            songId,
                            fileObj
                        );
                    }
                }

                renderRoster();

                alert(
                    "Team Imported!\n" +
                    roster.length +
                    " players loaded"
                );
            }
            catch(error){

                console.error(error);

                alert(
                    "Import failed.\nCheck console."
                );
            }
        };

    reader.readAsText(
        file
    );
}