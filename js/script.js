// Navigation mobile
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const navItems = document.querySelectorAll('.nav-links li');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    hamburger.classList.toggle('active');
});

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navLinks.classList.remove('active');
        hamburger.classList.remove('active');
    });
});

// Changement de style du header au scroll
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    header.classList.toggle('scrolled', window.scrollY > 50);
});

// Filtrage de la galerie
const filterBtns = document.querySelectorAll('.filter-btn');
const galleryItems = document.querySelectorAll('.gallery-item');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Retire la classe active de tous les boutons
        filterBtns.forEach(btn => btn.classList.remove('active'));
        // Ajoute la classe active au bouton cliqué
        btn.classList.add('active');
        
        const filter = btn.getAttribute('data-filter');
        
        galleryItems.forEach(item => {
            if (filter === 'all' || item.getAttribute('data-category') === filter) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });
});

// Lightbox pour la galerie
const galleryZoom = document.querySelectorAll('.gallery-zoom');
const lightboxModal = document.querySelector('.lightbox-modal');
const lightboxImg = document.querySelector('.lightbox-content');
const lightboxCaption = document.querySelector('.lightbox-caption');
const closeLightbox = document.querySelector('.close-lightbox');
const prevBtn = document.querySelector('.lightbox-prev');
const nextBtn = document.querySelector('.lightbox-next');

let currentImageIndex = 0;
const images = Array.from(galleryZoom).map(zoom => zoom.getAttribute('href'));
const captions = Array.from(galleryZoom).map(zoom => {
    const parentOverlay = zoom.closest('.gallery-overlay');
    return `${parentOverlay.querySelector('h3').textContent} - ${parentOverlay.querySelector('p').textContent}`;
});

galleryZoom.forEach((zoom, index) => {
    zoom.addEventListener('click', (e) => {
        e.preventDefault();
        currentImageIndex = index;
        openLightbox(currentImageIndex);
    });
});

function openLightbox(index) {
    lightboxModal.style.display = 'block';
    lightboxImg.src = images[index];
    lightboxCaption.textContent = captions[index];
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    lightboxModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function navigate(direction) {
    currentImageIndex += direction;
    
    if (currentImageIndex >= images.length) {
        currentImageIndex = 0;
    } else if (currentImageIndex < 0) {
        currentImageIndex = images.length - 1;
    }
    
    lightboxImg.src = images[currentImageIndex];
    lightboxCaption.textContent = captions[currentImageIndex];
}

closeLightbox.addEventListener('click', closeModal);
lightboxModal.addEventListener('click', (e) => {
    if (e.target === lightboxModal) {
        closeModal();
    }
});

prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigate(-1);
});

nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigate(1);
});

document.addEventListener('keydown', (e) => {
    if (lightboxModal.style.display === 'block') {
        if (e.key === 'Escape') {
            closeModal();
        } else if (e.key === 'ArrowLeft') {
            navigate(-1);
        } else if (e.key === 'ArrowRight') {
            navigate(1);
        }
    }
});


// Formulaire de contact
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Ici, vous pouvez ajouter la logique pour envoyer le formulaire
        // Pour cet exemple, nous simulons juste un envoi réussi
        
        // Masque le formulaire
        contactForm.style.display = 'none';
        // Affiche le message de succès
        formSuccess.style.display = 'block';
        
        // Réinitialise le formulaire après 5 secondes (pour la démo)
        setTimeout(() => {
            contactForm.style.display = 'block';
            formSuccess.style.display = 'none';
            contactForm.reset();
        }, 5000);
    });
}

// Animation au défilement
function animateOnScroll() {
    const elements = document.querySelectorAll('.service-card, .value-card, .testimonial, .milestone');
    
    elements.forEach(element => {
        const elementPosition = element.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.2;
        
        if (elementPosition < screenPosition) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
}

// Initialise les éléments avec une opacité à 0 pour l'animation
window.addEventListener('DOMContentLoaded', () => {
    const elements = document.querySelectorAll('.service-card, .value-card, .testimonial, .milestone');
    
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
    
    // Déclenche une première animation
    setTimeout(animateOnScroll, 100);
});

window.addEventListener('scroll', animateOnScroll);