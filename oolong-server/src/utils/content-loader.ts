import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Product, ProductRelease, Component, Release, Collection } from '../generated-nest/models';

export class ContentLoader {
  private readonly contentDir: string;

  constructor(contentDir?: string) {
    // Default to src/content, but allow override
    this.contentDir = contentDir || path.join(__dirname, '../../src/content');
    console.log('ContentLoader initialized with directory:', this.contentDir);
    console.log('__dirname:', __dirname);
    console.log('Directory exists:', fs.existsSync(this.contentDir));
  }

  /**
   * Load a YAML file and parse it
   */
  private loadYamlFile<T>(filePath: string): T | null {
    try {
      const fullPath = path.resolve(filePath);
      if (!fs.existsSync(fullPath)) {
        return null;
      }
      const content = fs.readFileSync(fullPath, 'utf8');
      return yaml.load(content) as T;
    } catch (error) {
      console.error(`Error loading YAML file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Recursively find all files matching a pattern
   */
  private findFiles(dir: string, pattern: RegExp): string[] {
    const results: string[] = [];
    
    if (!fs.existsSync(dir)) {
      return results;
    }

    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        results.push(...this.findFiles(filePath, pattern));
      } else if (pattern.test(file)) {
        results.push(filePath);
      }
    }
    
    return results;
  }

  /**
   * Load all products
   */
  loadAllProducts(): Product[] {
    const productsDir = path.join(this.contentDir, 'products');
    console.log('Loading products from:', productsDir);
    console.log('Products dir exists:', fs.existsSync(productsDir));
    const productFiles = this.findFiles(productsDir, /^product\.yaml$/);
    console.log('Found product files:', productFiles);
    
    const products = productFiles
      .map(file => this.loadYamlFile<Product>(file))
      .filter((p): p is Product => p !== null);
    console.log('Loaded products:', products);
    
    return products;
  }

  /**
   * Load a product by UUID
   */
  loadProductByUuid(uuid: string): Product | null {
    const products = this.loadAllProducts();
    return products.find(p => p.uuid === uuid) || null;
  }

  /**
   * Load all product releases
   */
  loadAllProductReleases(): ProductRelease[] {
    const productsDir = path.join(this.contentDir, 'products');
    console.log('Loading product releases from:', productsDir);
    const allReleaseFiles = this.findFiles(productsDir, /^release\.yaml$/);
    console.log('All release.yaml files found:', allReleaseFiles);
    const releaseFiles = allReleaseFiles
      .filter(f => f.includes(path.sep + 'releases' + path.sep));
    console.log('Found product release files:', releaseFiles);
    
    const releases = releaseFiles
      .map(file => {
        const release = this.loadYamlFile<ProductRelease>(file);
        if (!release) return null;
        
        // Find the parent product by traversing up the directory structure
        // Path structure: .../products/{product_name}/releases/{release_version}/release.yaml
        const releaseDir = path.dirname(file);
        const releasesDir = path.dirname(releaseDir);
        const productDir = path.dirname(releasesDir);
        const productFile = path.join(productDir, 'product.yaml');
        
        const product = this.loadYamlFile<Product>(productFile);
        if (product) {
          // Populate product and productName from the parent product
          release.product = product.uuid;
          release.productName = product.name;
        }
        
        return release;
      })
      .filter((r): r is ProductRelease => r !== null);
    console.log('Loaded product releases:', releases);
    
    return releases;
  }

  /**
   * Load a product release by UUID
   */
  loadProductReleaseByUuid(uuid: string): ProductRelease | null {
    const releases = this.loadAllProductReleases();
    return releases.find(r => r.uuid === uuid) || null;
  }

  /**
   * Load product releases by product UUID
   */
  loadProductReleasesByProductUuid(productUuid: string): ProductRelease[] {
    const releases = this.loadAllProductReleases();
    console.log(`Filtering releases for product ${productUuid}`);
    console.log('All releases:', releases.map(r => ({ uuid: r.uuid, product: r.product })));
    const filtered = releases.filter(r => r.product === productUuid);
    console.log('Filtered releases:', filtered);
    return filtered;
  }

  /**
   * Load all components
   */
  loadAllComponents(): Component[] {
    const componentsDir = path.join(this.contentDir, 'components');
    const componentFiles = this.findFiles(componentsDir, /^component\.yaml$/);
    
    return componentFiles
      .map(file => this.loadYamlFile<Component>(file))
      .filter((c): c is Component => c !== null);
  }

  /**
   * Load a component by UUID
   */
  loadComponentByUuid(uuid: string): Component | null {
    const components = this.loadAllComponents();
    return components.find(c => c.uuid === uuid) || null;
  }

  /**
   * Load all component releases
   */
  loadAllComponentReleases(): Release[] {
    const componentsDir = path.join(this.contentDir, 'components');
    const releaseFiles = this.findFiles(componentsDir, /^release\.yaml$/)
      .filter(f => f.includes(path.sep + 'releases' + path.sep));
    
    return releaseFiles
      .map(file => {
        const release = this.loadYamlFile<Release>(file);
        if (!release) return null;
        
        // Find the parent component by traversing up the directory structure
        // Path structure: .../components/{component_name}/releases/{release_version}/release.yaml
        const releaseDir = path.dirname(file);
        const releasesDir = path.dirname(releaseDir);
        const componentDir = path.dirname(releasesDir);
        const componentFile = path.join(componentDir, 'component.yaml');
        
        const component = this.loadYamlFile<Component>(componentFile);
        if (component) {
          // Populate component and componentName from the parent component
          release.component = component.uuid;
          release.componentName = component.name;
        }
        
        return release;
      })
      .filter((r): r is Release => r !== null);
  }

  /**
   * Load a component release by UUID
   */
  loadComponentReleaseByUuid(uuid: string): Release | null {
    const releases = this.loadAllComponentReleases();
    return releases.find(r => r.uuid === uuid) || null;
  }

  /**
   * Load component releases by component UUID
   */
  loadComponentReleasesByComponentUuid(componentUuid: string): Release[] {
    const releases = this.loadAllComponentReleases();
    return releases.filter(r => r.component === componentUuid);
  }

  /**
   * Load all collections for a component release
   */
  loadCollectionsByComponentReleaseUuid(releaseUuid: string): Collection[] {
    const componentsDir = path.join(this.contentDir, 'components');
    
    console.log(`Loading collections for component release: ${releaseUuid}`);
    
    // Find the release directory
    const releaseFiles = this.findFiles(componentsDir, /^release\.yaml$/)
      .filter(f => f.includes(path.sep + 'releases' + path.sep));
    
    console.log('Component release files found:', releaseFiles);
    
    for (const releaseFile of releaseFiles) {
      const release = this.loadYamlFile<Release>(releaseFile);
      console.log(`Checking release file ${releaseFile}, uuid: ${release?.uuid}`);
      if (release?.uuid === releaseUuid) {
        // Found the release, now look for collections in the same directory
        const releaseDir = path.dirname(releaseFile);
        const collectionsDir = path.join(releaseDir, 'collections');
        
        console.log('Release found! Collections dir:', collectionsDir);
        console.log('Collections dir exists:', fs.existsSync(collectionsDir));
        
        if (fs.existsSync(collectionsDir)) {
          const collectionFiles = this.findFiles(collectionsDir, /\.yaml$/);
          console.log('Collection files found:', collectionFiles);
          const collections = collectionFiles
            .map(file => {
              const collection = this.loadYamlFile<Collection>(file);
              if (!collection) return null;
              
              // Populate uuid from the parent release
              collection.uuid = releaseUuid;
              
              // Determine belongsTo based on directory structure
              if (file.includes(path.sep + 'components' + path.sep)) {
                collection.belongsTo = 'COMPONENT_RELEASE' as any;
              } else if (file.includes(path.sep + 'products' + path.sep)) {
                collection.belongsTo = 'PRODUCT_RELEASE' as any;
              }
              
              return collection;
            })
            .filter((c): c is Collection => c !== null)
            .sort((a, b) => (a.version || 0) - (b.version || 0));
          console.log('Loaded collections:', collections);
          return collections;
        }
      }
    }
    
    console.log('No collections found for release');
    return [];
  }

  /**
   * Load a specific collection by release UUID and version
   */
  loadCollectionByReleaseUuidAndVersion(releaseUuid: string, version: number): Collection | null {
    const collections = this.loadCollectionsByComponentReleaseUuid(releaseUuid);
    return collections.find(c => c.version === version) || null;
  }

  /**
   * Load all collections for a product release
   */
  loadCollectionsByProductReleaseUuid(releaseUuid: string): Collection[] {
    const productsDir = path.join(this.contentDir, 'products');
    
    console.log(`Loading collections for product release: ${releaseUuid}`);
    
    // Find the release directory
    const releaseFiles = this.findFiles(productsDir, /^release\.yaml$/)
      .filter(f => f.includes(path.sep + 'releases' + path.sep));
    
    console.log('Product release files found:', releaseFiles);
    
    for (const releaseFile of releaseFiles) {
      const release = this.loadYamlFile<ProductRelease>(releaseFile);
      console.log(`Checking release file ${releaseFile}, uuid: ${release?.uuid}`);
      if (release?.uuid === releaseUuid) {
        // Found the release, now look for collections in the same directory
        const releaseDir = path.dirname(releaseFile);
        const collectionsDir = path.join(releaseDir, 'collections');
        
        console.log('Release found! Collections dir:', collectionsDir);
        console.log('Collections dir exists:', fs.existsSync(collectionsDir));
        
        if (fs.existsSync(collectionsDir)) {
          const collectionFiles = this.findFiles(collectionsDir, /\.yaml$/);
          console.log('Collection files found:', collectionFiles);
          const collections = collectionFiles
            .map(file => {
              const collection = this.loadYamlFile<Collection>(file);
              if (!collection) return null;
              
              // Populate uuid from the parent release
              collection.uuid = releaseUuid;
              
              // Determine belongsTo based on directory structure
              if (file.includes(path.sep + 'components' + path.sep)) {
                collection.belongsTo = 'COMPONENT_RELEASE' as any;
              } else if (file.includes(path.sep + 'products' + path.sep)) {
                collection.belongsTo = 'PRODUCT_RELEASE' as any;
              }
              
              return collection;
            })
            .filter((c): c is Collection => c !== null)
            .sort((a, b) => (a.version || 0) - (b.version || 0));
          console.log('Loaded collections:', collections);
          return collections;
        }
      }
    }
    
    console.log('No collections found for release');
    return [];
  }
}
