import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface VehicleModel {
  id: string;
  name: string;
  imageUrl: string;
  year?: number;
  description?: string;
}

export interface VehicleMake {
  id: string;
  name: string;
  logoUrl?: string;
  models: VehicleModel[];
}

@Injectable({
  providedIn: 'root'
})
export class VehicleCatalogService {
  
  private vehicleData: VehicleMake[] = [
    {
      id: 'toyota',
      name: 'Toyota',
      logoUrl: 'https://www.toyota.com/content/dam/toyota/branding/toyota_logo_red.png',
      models: [
        {
          id: 'corolla',
          name: 'Corolla',
          imageUrl: 'https://www.toyota.com/imgix/content/dam/toyota/vehicles/2024/corolla/overview/desktop/2024-corolla-overview-hero-desktop-2880x1620-xle.png',
          year: 2024,
          description: 'Sedán compacto confiable'
        },
        {
          id: 'camry',
          name: 'Camry',
          imageUrl: 'https://www.toyota.com/imgix/content/dam/toyota/vehicles/2024/camry/overview/desktop/2024-camry-overview-hero-desktop-2880x1620-le.png',
          year: 2024,
          description: 'Sedán de tamaño medio'
        },
        {
          id: 'rav4',
          name: 'RAV4',
          imageUrl: 'https://www.toyota.com/imgix/content/dam/toyota/vehicles/2024/rav4/overview/desktop/2024-rav4-overview-hero-desktop-2880x1620-le.png',
          year: 2024,
          description: 'SUV compacto'
        },
        {
          id: 'highlander',
          name: 'Highlander',
          imageUrl: 'https://www.toyota.com/imgix/content/dam/toyota/vehicles/2024/highlander/overview/desktop/2024-highlander-overview-hero-desktop-2880x1620-le.png',
          year: 2024,
          description: 'SUV de 3 filas'
        },
        {
          id: 'prius',
          name: 'Prius',
          imageUrl: 'https://www.toyota.com/imgix/content/dam/toyota/vehicles/2024/prius/overview/desktop/2024-prius-overview-hero-desktop-2880x1620-le.png',
          year: 2024,
          description: 'Híbrido eficiente'
        }
      ]
    },
    {
      id: 'ford',
      name: 'Ford',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Ford_logo_flat.svg',
      models: [
        {
          id: 'f150',
          name: 'F-150',
          imageUrl: 'https://build.ford.com/dig/Ford/F-150/2024/HD-TILE/Image%5B%7CFord%7CF-150%7C2024%7C1%7C1.%7C803A.V8.RWD.146.CC.XLT.88B.58J.64T.91C.924.%5D/EXT/1/vehicle.png',
          year: 2024,
          description: 'Pickup resistente'
        },
        {
          id: 'escape',
          name: 'Escape',
          imageUrl: 'https://build.ford.com/dig/Ford/Escape/2024/HD-TILE/Image%5B%7CFord%7CEscape%7C2024%7C1%7C1.%7C200A.ICECO.AWD.S.%5D/EXT/1/vehicle.png',
          year: 2024,
          description: 'SUV compacto'
        },
        {
          id: 'explorer',
          name: 'Explorer',
          imageUrl: 'https://build.ford.com/dig/Ford/Explorer/2024/HD-TILE/Image%5B%7CFord%7CExplorer%7C2024%7C1%7C1.%7C200A.ECOBOOST.RWD.BASE.%5D/EXT/1/vehicle.png',
          year: 2024,
          description: 'SUV familiar'
        },
        {
          id: 'mustang',
          name: 'Mustang',
          imageUrl: 'https://build.ford.com/dig/Ford/Mustang/2024/HD-TILE/Image%5B%7CFord%7CMustang%7C2024%7C1%7C1.%7C101A.ECOBOOST.RWD.FASTBACK.%5D/EXT/1/vehicle.png',
          year: 2024,
          description: 'Deportivo icónico'
        },
        {
          id: 'transit',
          name: 'Transit',
          imageUrl: 'https://build.ford.com/dig/Ford/Transit%20Van/2024/HD-TILE/Image%5B%7CFord%7CTransit%20Van%7C2024%7C1%7C1.%7C110A.V6.RWD.148WB.LR.CARGO.%5D/EXT/1/vehicle.png',
          year: 2024,
          description: 'Van comercial'
        }
      ]
    },
    {
      id: 'chevrolet',
      name: 'Chevrolet',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Chevrolet_logo.svg/1200px-Chevrolet_logo.svg.png',
      models: [
        {
          id: 'silverado',
          name: 'Silverado',
          imageUrl: 'https://www.chevrolet.com/content/dam/chevrolet/na/us/english/index/vehicles/2024/trucks/silverado-1500/colorizer/01-images/2024-silverado-1500-crew-cab-wt-gba.jpg',
          year: 2024,
          description: 'Pickup potente'
        },
        {
          id: 'equinox',
          name: 'Equinox',
          imageUrl: 'https://www.chevrolet.com/content/dam/chevrolet/na/us/english/index/vehicles/2024/crossovers-suvs/equinox/colorizer/01-images/2024-equinox-1ls-gba.jpg',
          year: 2024,
          description: 'SUV compacto'
        },
        {
          id: 'tahoe',
          name: 'Tahoe',
          imageUrl: 'https://www.chevrolet.com/content/dam/chevrolet/na/us/english/index/vehicles/2024/suvs/tahoe/colorizer/01-images/2024-tahoe-ls-gba.jpg',
          year: 2024,
          description: 'SUV grande'
        },
        {
          id: 'malibu',
          name: 'Malibu',
          imageUrl: 'https://www.chevrolet.com/content/dam/chevrolet/na/us/english/index/vehicles/2024/cars/malibu/colorizer/01-images/2024-malibu-ls-gba.jpg',
          year: 2024,
          description: 'Sedán de tamaño medio'
        },
        {
          id: 'suburban',
          name: 'Suburban',
          imageUrl: 'https://www.chevrolet.com/content/dam/chevrolet/na/us/english/index/vehicles/2024/suvs/suburban/colorizer/01-images/2024-suburban-ls-gba.jpg',
          year: 2024,
          description: 'SUV extra grande'
        }
      ]
    },
    {
      id: 'nissan',
      name: 'Nissan',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Nissan_logo.svg/1200px-Nissan_logo.svg.png',
      models: [
        {
          id: 'altima',
          name: 'Altima',
          imageUrl: 'https://www.nissanusa.com/content/dam/Nissan/us/vehicles/altima/2024/overview/design/2024-nissan-altima-front-3qtr-view.jpg',
          year: 2024,
          description: 'Sedán moderno'
        },
        {
          id: 'rogue',
          name: 'Rogue',
          imageUrl: 'https://www.nissanusa.com/content/dam/Nissan/us/vehicles/rogue/2024/overview/design/2024-nissan-rogue-front-3qtr-view.jpg',
          year: 2024,
          description: 'SUV compacto familiar'
        },
        {
          id: 'pathfinder',
          name: 'Pathfinder',
          imageUrl: 'https://www.nissanusa.com/content/dam/Nissan/us/vehicles/pathfinder/2024/overview/design/2024-nissan-pathfinder-front-3qtr-view.jpg',
          year: 2024,
          description: 'SUV de 3 filas'
        },
        {
          id: 'frontier',
          name: 'Frontier',
          imageUrl: 'https://www.nissanusa.com/content/dam/Nissan/us/vehicles/frontier/2024/overview/design/2024-nissan-frontier-front-3qtr-view.jpg',
          year: 2024,
          description: 'Pickup mediana'
        },
        {
          id: 'sentra',
          name: 'Sentra',
          imageUrl: 'https://www.nissanusa.com/content/dam/Nissan/us/vehicles/sentra/2024/overview/design/2024-nissan-sentra-front-3qtr-view.jpg',
          year: 2024,
          description: 'Sedán compacto'
        }
      ]
    },
    {
      id: 'honda',
      name: 'Honda',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Honda_logo.svg/1200px-Honda_logo.svg.png',
      models: [
        {
          id: 'civic',
          name: 'Civic',
          imageUrl: 'https://automobiles.honda.com/images/2024/civic-sedan/non-hybrid/exterior/2024-civic-sedan-touring-crystal-black-pearl-exterior-gallery-1.png',
          year: 2024,
          description: 'Compacto versátil'
        },
        {
          id: 'accord',
          name: 'Accord',
          imageUrl: 'https://automobiles.honda.com/images/2024/accord/exterior/2024-accord-sport-still-night-pearl-exterior-gallery-1.png',
          year: 2024,
          description: 'Sedán premium'
        },
        {
          id: 'crv',
          name: 'CR-V',
          imageUrl: 'https://automobiles.honda.com/images/2024/cr-v/exterior/2024-crv-ex-l-crystal-black-pearl-exterior-gallery-1.png',
          year: 2024,
          description: 'SUV compacto popular'
        },
        {
          id: 'pilot',
          name: 'Pilot',
          imageUrl: 'https://automobiles.honda.com/images/2024/pilot/exterior/2024-pilot-touring-crystal-black-pearl-exterior-gallery-1.png',
          year: 2024,
          description: 'SUV de 3 filas'
        },
        {
          id: 'ridgeline',
          name: 'Ridgeline',
          imageUrl: 'https://automobiles.honda.com/images/2024/ridgeline/exterior/2024-ridgeline-black-edition-crystal-black-pearl-exterior-gallery-1.png',
          year: 2024,
          description: 'Pickup innovadora'
        }
      ]
    },
    {
      id: 'bmw',
      name: 'BMW',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/1200px-BMW.svg.png',
      models: [
        {
          id: 'x1',
          name: 'X1',
          imageUrl: 'https://prod.cosy.bmw.cloud/bmwweb/cosySec?COSY-EU-100-7331cqgv2Z7d%24lylGde5BqjM17Fp2OfKDjRupFGK%24sfVzn0OHWV%24wl7LsIHtE1ePdJsGm5%24rlqwt9N%24RQfOzJZV%24Wf',
          year: 2024,
          description: 'SUV compacto premium'
        },
        {
          id: 'x3',
          name: 'X3',
          imageUrl: 'https://prod.cosy.bmw.cloud/bmwweb/cosySec?COSY-EU-100-7331cqgv2Z7d%24lylGde5BqjM17Fp2OfKDjRupFGK%24sfVzn0OHWV%24wl7LsIHtE1ePdJsGm5%24rlqwt9N%24RQfOzJZV%24Wf',
          year: 2024,
          description: 'SUV mediano premium'
        },
        {
          id: 'series3',
          name: 'Serie 3',
          imageUrl: 'https://prod.cosy.bmw.cloud/bmwweb/cosySec?COSY-EU-100-7331cqgv2Z7d%24lylGde5BqjM17Fp2OfKDjRupFGK%24sfVzn0OHWV%24wl7LsIHtE1ePdJsGm5%24rlqwt9N%24RQfOzJZV%24Wf',
          year: 2024,
          description: 'Sedán deportivo'
        },
        {
          id: 'x5',
          name: 'X5',
          imageUrl: 'https://prod.cosy.bmw.cloud/bmwweb/cosySec?COSY-EU-100-7331cqgv2Z7d%24lylGde5BqjM17Fp2OfKDjRupFGK%24sfVzn0OHWV%24wl7LsIHtE1ePdJsGm5%24rlqwt9N%24RQfOzJZV%24Wf',
          year: 2024,
          description: 'SUV grande premium'
        }
      ]
    }
  ];

  constructor() { }

  // Obtener todas las marcas
  getMakes(): Observable<VehicleMake[]> {
    return of(this.vehicleData);
  }

  // Obtener solo los nombres de las marcas
  getMakeNames(): Observable<string[]> {
    const makeNames = this.vehicleData.map(make => make.name);
    return of(makeNames);
  }

  // Obtener modelos por marca
  getModelsByMake(makeName: string): Observable<VehicleModel[]> {
    const make = this.vehicleData.find(m => 
      m.name.toLowerCase() === makeName.toLowerCase() || 
      m.id.toLowerCase() === makeName.toLowerCase()
    );
    return of(make ? make.models : []);
  }

  // Obtener información de una marca específica
  getMakeInfo(makeName: string): Observable<VehicleMake | null> {
    const make = this.vehicleData.find(m => 
      m.name.toLowerCase() === makeName.toLowerCase() || 
      m.id.toLowerCase() === makeName.toLowerCase()
    );
    return of(make || null);
  }

  // Buscar modelos por texto
  searchModels(searchTerm: string): Observable<VehicleModel[]> {
    const allModels: VehicleModel[] = [];
    this.vehicleData.forEach(make => {
      make.models.forEach(model => {
        if (model.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          allModels.push(model);
        }
      });
    });
    return of(allModels);
  }
}
