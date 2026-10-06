// SUPABASE SETTINGS

const SUPABASE_URL = "https://ofrfarrvhxrcuimwlkuz.supabase.co";

const SUPABASE_KEY = "sb_publishable_xXuj7gS9y9GKNkEm2L5xbA_49QQ0ZUM";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ========================================
// VARIABLES
// ========================================

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

let photos = [];
let currentPhoto = 0;
let currentFilter = "all";


// ========================================
// LOAD PHOTOS
// ========================================

async function loadPhotos() {

    gallery.innerHTML = '<p class="loading">Loading photos...</p>';

    photos = [];

    const categories = [
        "family",
        "friends",
        "nature",
        "groups"
    ];

    for (const category of categories) {

        const { data, error } = await supabaseClient
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
            console.error("Error loading", category, error);
            continue;
        }

        if (!data) continue;

        for (const file of data) {

            // Ignore folders
            if (!file.name) continue;

            const path = `${category}/${file.name}`;

            const { data: publicData } =
                supabaseClient
                    .storage
                    .from("photos")
                    .getPublicUrl(path);

            photos.push({
                name: file.name,
                category: category,
                path: path,
                url: publicData.publicUrl
            });
        }
    }

    displayPhotos();
}


// ========================================
// DISPLAY PHOTOS
// ========================================

function displayPhotos() {

    gallery.innerHTML = "";

    let filteredPhotos = photos;

    if (currentFilter !== "all") {

        filteredPhotos = photos.filter(
            photo => photo.category === currentFilter
        );
    }

    if (filteredPhotos.length === 0) {

        gallery.innerHTML = `
            <div class="empty">
                <h2>No photos yet 📷</h2>
                <p>Click "Add Photos" to upload some.</p>
            </div>
        `;

        return;
    }

    filteredPhotos.forEach((photo, index) => {

        const card = document.createElement("div");

        card.className = "photo-card";

        card.innerHTML = `
            <img
                src="${photo.url}"
                alt="${photo.name}"
                loading="lazy"
            >
        `;

        card.addEventListener("click", () => {

            currentPhoto = photos.indexOf(photo);

            openViewer();

        });

        gallery.appendChild(card);
    });
}


// ========================================
// FILTERS
// ========================================

filters.forEach(button => {

    button.addEventListener("click", () => {

        filters.forEach(btn =>
            btn.classList.remove("active")
        );

        button.classList.add("active");

        currentFilter = button.dataset.category;

        displayPhotos();

    });

});


// ========================================
// OPEN UPLOAD BOX
// ========================================

uploadBtn.addEventListener("click", () => {

    uploadBox.classList.remove("hidden");

});


// ========================================
// CANCEL UPLOAD
// ========================================

cancelUpload.addEventListener("click", () => {

    uploadBox.classList.add("hidden");

});


// ========================================
// CHOOSE PHOTOS
// ========================================

choosePhotos.addEventListener("click", () => {

    fileInput.click();

});


// ========================================
// UPLOAD PHOTOS
// ========================================

fileInput.addEventListener("change", async () => {

    const files = Array.from(fileInput.files);

    if (files.length === 0) return;

    const category = categorySelect.value;

    uploadBox.classList.add("hidden");

    uploadBtn.textContent = "Uploading...";

    uploadBtn.disabled = true;


    for (const file of files) {

        try {

            // Make filename safer
            const cleanName = file.name
                .replace(/[^a-zA-Z0-9._-]/g, "_");

            const filename =
                `${Date.now()}-${Math.random()
                    .toString(36)
                    .substring(2, 8)}-${cleanName}`;

            const filePath =
                `${category}/${filename}`;


            const { error } =
                await supabaseClient
                    .storage
                    .from("photos")
                    .upload(filePath, file, {
                        cacheControl: "3600",
                        upsert: false
                    });


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


    uploadBtn.textContent = "📤 Add Photos";

    uploadBtn.disabled = false;

    fileInput.value = "";

    await loadPhotos();

});


// ========================================
// PHOTO VIEWER
// ========================================

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
            currentPhoto >= photos.length
        ) {

            currentPhoto = 0;

        }

        showViewerPhoto();

    }
);


// ========================================
// KEYBOARD CONTROLS
// ========================================

document.addEventListener("keydown", event => {

    if (viewer.classList.contains("hidden"))
        return;


    if (event.key === "Escape") {

        closePhotoViewer();

    }


    if (event.key === "ArrowLeft") {

        previousPhoto.click();

    }


    if (event.key === "ArrowRight") {

        nextPhoto.click();

    }

});


// ========================================
// START
// ========================================

loadPhotos();