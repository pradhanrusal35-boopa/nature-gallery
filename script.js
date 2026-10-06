// ================================
// SUPABASE
// ================================

const SUPABASE_URL = "YOUR_PROJECT_URL";
const SUPABASE_KEY = "YOUR_PUBLISHABLE_KEY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ================================
// ELEMENTS
// ================================

const loginScreen = document.getElementById("loginScreen");
const mainSite = document.getElementById("mainSite");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");

const logoutBtn = document.getElementById("logoutBtn");

const gallery = document.getElementById("gallery");

const uploadBtn = document.getElementById("uploadBtn");
const uploadBox = document.getElementById("uploadBox");

const choosePhotos = document.getElementById("choosePhotos");
const cancelUpload = document.getElementById("cancelUpload");

const fileInput = document.getElementById("fileInput");
const categorySelect = document.getElementById("category");

const filters = document.querySelectorAll(".filter");

const viewer = document.getElementById("viewer");
const viewerImage = document.getElementById("viewerImage");

const closeViewer = document.getElementById("closeViewer");
const previousPhoto = document.getElementById("previousPhoto");
const nextPhoto = document.getElementById("nextPhoto");


// ================================
// VARIABLES
// ================================

let photos = [];
let currentPhoto = 0;
let currentFilter = "all";


// ================================
// AUTH
// ================================

async function checkLogin() {

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (session) {

        loginScreen.classList.add("hidden");
        mainSite.classList.remove("hidden");

        await loadPhotos();

    } else {

        loginScreen.classList.remove("hidden");
        mainSite.classList.add("hidden");

    }
}


// LOGIN

loginBtn.addEventListener("click", async () => {

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {

        loginMessage.textContent =
            "Please enter your email and password.";

        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    const {
        error
    } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {

        loginMessage.textContent =
            "Login failed. Check your email and password.";

        console.error(error);

        loginBtn.disabled = false;
        loginBtn.textContent = "🔐 Login";

        return;
    }

    loginMessage.textContent = "";

    loginBtn.disabled = false;
    loginBtn.textContent = "🔐 Login";

    await checkLogin();

});


// ENTER KEY LOGIN

loginPassword.addEventListener("keydown", event => {

    if (event.key === "Enter") {
        loginBtn.click();
    }

});


// LOGOUT

logoutBtn.addEventListener("click", async () => {

    await supabaseClient.auth.signOut();

    photos = [];

    gallery.innerHTML = "";

    checkLogin();

});


// WATCH AUTH CHANGES

supabaseClient.auth.onAuthStateChange(
    async (event, session) => {

        if (session) {

            loginScreen.classList.add("hidden");
            mainSite.classList.remove("hidden");

        } else {

            loginScreen.classList.remove("hidden");
            mainSite.classList.add("hidden");

        }

    }
);


// ================================
// LOAD PHOTOS
// ================================

async function loadPhotos() {

    gallery.innerHTML =
        '<p class="loading">Loading photos...</p>';

    photos = [];

    const categories = [
        "family",
        "friends",
        "nature",
        "groups"
    ];


    for (const category of categories) {

        const {
            data,
            error
        } = await supabaseClient
            .storage
            .from("photos")
            .list(category, {
                limit: 1000,
                sortBy: {
                    column: "created_at",
                    order: "desc"
                }
            });


        if (error) {

            console.error(
                "Error loading",
                category,
                error
            );

            continue;
        }


        if (!data) continue;


        for (const file of data) {

            if (!file.name) continue;


            const path =
                `${category}/${file.name}`;


            // PRIVATE BUCKET:
            // Create temporary signed URL

            const {
                data: signedData,
                error: signedError
            } = await supabaseClient
                .storage
                .from("photos")
                .createSignedUrl(
                    path,
                    3600
                );


            if (signedError) {

                console.error(
                    "Signed URL error:",
                    signedError
                );

                continue;
            }


            photos.push({

                name: file.name,

                category: category,

                path: path,

                url: signedData.signedUrl

            });

        }

    }


    displayPhotos();

}


// ================================
// DISPLAY PHOTOS
// ================================

function displayPhotos() {

    gallery.innerHTML = "";


    let filteredPhotos = photos;


    if (currentFilter !== "all") {

        filteredPhotos =
            photos.filter(
                photo =>
                    photo.category === currentFilter
            );

    }


    if (filteredPhotos.length === 0) {

        gallery.innerHTML = `
            <div class="empty">

                <h2>No photos yet 📷</h2>

                <p>
                    Upload some photos to get started.
                </p>

            </div>
        `;

        return;
    }


    filteredPhotos.forEach(photo => {

        const card =
            document.createElement("div");

        card.className = "photo-card";


        card.innerHTML = `
            <img
                src="${photo.url}"
                alt="${photo.name}"
                loading="lazy"
            >
        `;


        card.addEventListener(
            "click",
            () => {

                currentPhoto =
                    photos.indexOf(photo);

                openViewer();

            }
        );


        gallery.appendChild(card);

    });

}


// ================================
// FILTERS
// ================================

filters.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            filters.forEach(btn =>
                btn.classList.remove("active")
            );

            button.classList.add("active");

            currentFilter =
                button.dataset.category;

            displayPhotos();

        }
    );

});


// ================================
// UPLOAD
// ================================

uploadBtn.addEventListener(
    "click",
    () => {

        uploadBox.classList.remove("hidden");

    }
);


cancelUpload.addEventListener(
    "click",
    () => {

        uploadBox.classList.add("hidden");

    }
);


choosePhotos.addEventListener(
    "click",
    () => {

        fileInput.click();

    }
);


fileInput.addEventListener(
    "change",
    async () => {

        const files =
            Array.from(fileInput.files);


        if (files.length === 0) return;


        const category =
            categorySelect.value;


        uploadBox.classList.add("hidden");

        uploadBtn.textContent =
            "Uploading...";

        uploadBtn.disabled = true;


        for (const file of files) {

            try {

                const cleanName =
                    file.name.replace(
                        /[^a-zA-Z0-9._-]/g,
                        "_"
                    );


                const filename =
                    `${Date.now()}-${Math.random()
                    .toString(36)
                    .substring(2, 8)}-${cleanName}`;


                const filePath =
                    `${category}/${filename}`;


                const {
                    error
                } = await supabaseClient
                    .storage
                    .from("photos")
                    .upload(
                        filePath,
                        file,
                        {
                            cacheControl: "3600",
                            upsert: false
                        }
                    );


                if (error) {

                    console.error(
                        "Upload failed:",
                        error
                    );

                    alert(
                        `Upload failed for ${file.name}\n\n${error.message}`
                    );

                    continue;
                }


            } catch (error) {

                console.error(error);

            }

        }


        uploadBtn.textContent =
            "📤 Add Photos";

        uploadBtn.disabled = false;

        fileInput.value = "";


        await loadPhotos();

    }
);


// ================================
// PHOTO VIEWER
// ================================

function openViewer() {

    if (photos.length === 0) return;

    viewer.classList.remove("hidden");

    showViewerPhoto();

}


function showViewerPhoto() {

    viewerImage.src =
        photos[currentPhoto].url;

}


function closePhotoViewer() {

    viewer.classList.add("hidden");

}


closeViewer.addEventListener(
    "click",
    closePhotoViewer
);


previousPhoto.addEventListener(
    "click",
    () => {

        currentPhoto--;

        if (currentPhoto < 0) {

            currentPhoto =
                photos.length - 1;

        }

        showViewerPhoto();

    }
);


nextPhoto.addEventListener(
    "click",
    () => {

        currentPhoto++;

        if (
            currentPhoto >=
            photos.length
        ) {

            currentPhoto = 0;

        }

        showViewerPhoto();

    }
);


document.addEventListener(
    "keydown",
    event => {

        if (
            viewer.classList.contains("hidden")
        ) return;


        if (event.key === "Escape") {

            closePhotoViewer();

        }


        if (event.key === "ArrowLeft") {

            previousPhoto.click();

        }


        if (event.key === "ArrowRight") {

            nextPhoto.click();

        }

    }
);


// ================================
// START
// ================================

checkLogin();
